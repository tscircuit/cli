import ky from "ky"
import type { FileServerRoutes } from "lib/file-server/FileServerRoutes"
import { createHttpServer } from "lib/server/createHttpServer"
import { EventsWatcher } from "lib/server/EventsWatcher"
import type http from "node:http"
import type { TypedKyInstance } from "typed-ky"
import path from "node:path"
import fs from "node:fs"
import type {
  FileUpdatedEvent,
  FileDeletedEvent,
} from "../../lib/file-server/FileServerEvent"
import * as chokidar from "chokidar"
import { pushSnippet } from "lib/shared/push-snippet"
import { getPackageFilePaths } from "./get-package-file-paths"
import { addPackage } from "lib/shared/add-package"
import Debug from "debug"
import kleur from "kleur"
import { loadProjectConfig } from "lib/project-config"
import { shouldIgnorePath } from "lib/shared/should-ignore-path"
import { getAllNodeModuleFilePaths } from "lib/dependency-analysis/getNodeModuleDependencies"
import { setSessionToken } from "lib/cli-config"

const debug = Debug("tscircuit:devserver")

const BINARY_FILE_EXTENSIONS = new Set([".glb", ".png", ".jpeg", ".jpg", ".step"])

type FileUploadPayload = Pick<
  FileServerRoutes["api/files/upsert"]["POST"]["requestJson"],
  "text_content" | "binary_content_b64"
>

export class DevServer {
  port: number
  /**
   * The path to a component that exports a <board /> or <group /> component
   */
  componentFilePath: string

  projectDir: string
  /** Paths or directory names to ignore when syncing files */
  ignoredFiles: string[]

  /**
   * The HTTP server that hosts the file server and event bus. You can use
   * fsKy to communicate with the file server/event bus
   */
  httpServer?: http.Server
  /**
   * Watches for events on the event bus by polling `api/events/list`
   */
  eventsWatcher?: EventsWatcher
  /**
   * A ky instance that can be used to communicate with the file server and
   * event bus
   */
  fsKy: TypedKyInstance<keyof FileServerRoutes, FileServerRoutes>
  /**
   * A chokidar instance that watches the project directory for file changes
   */
  filesystemWatcher?: chokidar.FSWatcher

  /**
   * Cache of node_modules that have already been uploaded to avoid re-uploading
   */
  private uploadedNodeModules: Set<string> = new Set()

  constructor({
    port,
    componentFilePath,
    projectDir,
  }: {
    port: number
    componentFilePath: string
    projectDir?: string
  }) {
    this.port = port
    this.componentFilePath = componentFilePath
    this.projectDir = projectDir ?? path.dirname(componentFilePath)
    const projectConfig = loadProjectConfig(this.projectDir)
    this.ignoredFiles = projectConfig?.ignoredFiles ?? []
    this.fsKy = ky.create({
      prefixUrl: `http://localhost:${port}`,
    }) as any
  }

  async start() {
    const { server } = await createHttpServer({
      port: this.port,
      defaultMainComponentPath: path.relative(
        this.projectDir,
        this.componentFilePath,
      ),
    })
    this.httpServer = server

    this.eventsWatcher = new EventsWatcher(`http://localhost:${this.port}`)
    this.eventsWatcher.start()

    this.eventsWatcher.on(
      "FILE_UPDATED",
      this.handleFileUpdatedEventFromServer.bind(this),
    )

    this.eventsWatcher.on(
      "FILE_DELETED",
      this.handleFileDeletedEventFromServer.bind(this),
    )

    this.eventsWatcher.on(
      "REQUEST_TO_SAVE_SNIPPET",
      this.saveSnippet.bind(this),
    )

    this.eventsWatcher.on("INSTALL_PACKAGE", (event) =>
      this.handleInstallPackage(event.full_package_name),
    )

    this.eventsWatcher.on("TOKEN_UPDATED", (event) =>
      this.handleTokenUpdated(event.registry_token),
    )

    this.filesystemWatcher = chokidar.watch(this.projectDir, {
      persistent: true,
      ignoreInitial: true,
      ignored: (p) =>
        shouldIgnorePath(path.relative(this.projectDir, p), this.ignoredFiles),
    })

    this.filesystemWatcher.on("change", (filePath) =>
      this.handleFileChangedOnFilesystem(filePath),
    )
    this.filesystemWatcher.on("add", (filePath) =>
      this.handleFileChangedOnFilesystem(filePath),
    )
    this.filesystemWatcher.on("unlink", (filePath) =>
      this.handleFileRemovedFromFilesystem(filePath),
    )
    this.filesystemWatcher.on("unlinkDir", (filePath) =>
      this.handleFileRemovedFromFilesystem(filePath),
    )
    this.filesystemWatcher.on("rename", (oldPath, newPath) =>
      this.handleFileRename(oldPath, newPath),
    )

    await this.upsertInitialFiles()
  }

  async handleFileUpdatedEventFromServer(ev: FileUpdatedEvent) {
    if (ev.initiator === "filesystem_change") return

    const { file } = await this.fsKy
      .get("api/files/get", {
        searchParams: { file_path: ev.file_path },
      })
      .json()

    // Create directory structure if it doesn't exist
    const fullPath = path.join(this.projectDir, ev.file_path)
    const dirPath = path.dirname(fullPath)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    if (file.binary_content_b64) {
      const decodedContent = Buffer.from(file.binary_content_b64, "base64")
      fs.writeFileSync(fullPath, decodedContent)
    } else {
      fs.writeFileSync(fullPath, file.text_content ?? "", "utf-8")
    }
  }

  async handleFileDeletedEventFromServer(ev: FileDeletedEvent) {
    const fullPath = path.join(this.projectDir, ev.file_path)

    if (fs.existsSync(fullPath)) {
      debug(`Deleting file ${ev.file_path} from filesystem`)
      fs.unlinkSync(fullPath)
    }
  }

  async handleFileChangedOnFilesystem(absoluteFilePath: string) {
    const relativeFilePath = path.relative(this.projectDir, absoluteFilePath)
    // We've temporarily disabled upserting manual edits from filesystem changes
    // because it can be edited by the browser
    if (relativeFilePath.includes("manual-edits.json")) return
    // Skip files inside the .git directory
    if (shouldIgnorePath(relativeFilePath, this.ignoredFiles)) return

    const filePayload = this.createFileUploadPayload(
      absoluteFilePath,
      relativeFilePath,
    )

    console.log(kleur.green(`Saving: ${relativeFilePath}`))
    await this.fsKy
      .post("api/files/upsert", {
        json: {
          file_path: relativeFilePath,
          initiator: "filesystem_change",
          ...filePayload,
        },
      })
      .json()

    // Check if this file has new node_modules dependencies
    await this.checkAndUploadNewNodeModules(absoluteFilePath)
  }

  /**
   * Checks if a file change introduces new local node_modules dependencies and uploads them
   *
   * This method is called when a file changes on the filesystem. It analyzes the file
   * for new imports from local packages (yalc/file: protocol) and uploads any new files
   * from those packages that haven't been uploaded yet.
   *
   * Only applies to TypeScript/JavaScript files, as they're the only files that can have imports.
   */
  private async checkAndUploadNewNodeModules(filePath: string) {
    const ext = path.extname(filePath).toLowerCase()
    const isSourceFile = [".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)

    if (!isSourceFile) return

    try {
      const nodeModuleFiles = getAllNodeModuleFilePaths(
        filePath,
        this.projectDir,
      )

      // Filter to only files that haven't been uploaded yet
      const newFiles = nodeModuleFiles.filter((file) => {
        const relativePath = path.relative(this.projectDir, file)
        return !this.uploadedNodeModules.has(relativePath)
      })

      if (newFiles.length === 0) return

      console.log(
        kleur.blue(`Uploading ${newFiles.length} new node_modules files...`),
      )

      await this.uploadNodeModuleFiles(newFiles)

      console.log(kleur.green("New node modules uploaded"))
    } catch (error) {
      debug("Error checking for new node modules:", error)
    }
  }

  async handleFileRemovedFromFilesystem(absoluteFilePath: string) {
    const relativeFilePath = path.relative(this.projectDir, absoluteFilePath)

    if (shouldIgnorePath(relativeFilePath, this.ignoredFiles)) return

    // Check if the path is empty or just whitespace
    if (!relativeFilePath || relativeFilePath.trim() === "") {
      debug("Skipping delete for empty file path")
      return
    }

    debug(`Deleting file ${relativeFilePath} from server`)

    // Use a wrapper function to handle potential connection errors
    const deleteFile = async () => {
      return await this.fsKy
        .post("api/files/delete", {
          json: {
            file_path: relativeFilePath,
            initiator: "filesystem_change",
          },
          throwHttpErrors: false,
          timeout: 5000, // Add timeout to prevent hanging
          retry: {
            limit: 3,
            methods: ["POST"],
            statusCodes: [408, 413, 429, 500, 502, 503, 504],
          },
        })
        .json()
    }

    // Use Promise.resolve to handle network errors without try/catch
    const response = await Promise.resolve(deleteFile()).catch((error) => {
      console.error(
        `Network error deleting ${relativeFilePath}: ${error instanceof Error ? error.message : String(error)}`,
      )
      return { error: "Connection error" }
    })

    if (response?.error) {
      // Don't treat "file not found" as a fatal error, just log it as debug
      if (response.error.includes("File not found")) {
        debug(`File not found: ${relativeFilePath}`)
      } else {
        console.error(
          `Failed to delete file ${relativeFilePath}: ${response.error}`,
        )
      }
      return
    }

    debug(`Successfully deleted file ${relativeFilePath} from server`)
  }
  async handleFileRename(oldPath: string, newPath: string) {
    const oldRelativePath = path.relative(this.projectDir, oldPath)
    const newRelativePath = path.relative(this.projectDir, newPath)

    if (
      shouldIgnorePath(oldRelativePath, this.ignoredFiles) ||
      shouldIgnorePath(newRelativePath, this.ignoredFiles)
    )
      return
    // First delete the old file from the file server
    await this.handleFileRemovedFromFilesystem(oldPath)

    // Then upsert the new file
    const filePayload = this.createFileUploadPayload(newPath, newRelativePath)
    await this.fsKy.post("api/files/upsert", {
      json: {
        file_path: newRelativePath,
        initiator: "filesystem_change",
        ...filePayload,
      },
    })

    debug(`File renamed from ${oldRelativePath} to ${newRelativePath}`)
  }

  async upsertInitialFiles() {
    await this.fsKy.post("api/events/reset", {
      json: {},
    })

    const filePaths = getPackageFilePaths(this.projectDir, this.ignoredFiles)

    for (const filePath of filePaths) {
      const relativeFilePath = path.relative(this.projectDir, filePath)
      const filePayload = this.createFileUploadPayload(
        filePath,
        relativeFilePath,
      )
      await this.fsKy.post("api/files/upsert", {
        json: {
          file_path: relativeFilePath,
          initiator: "filesystem_change",
          ...filePayload,
        },
      })
    }

    await this.uploadInitialNodeModules()

    await this.fsKy.post("api/events/create", {
      json: {
        event_type: "INITIAL_FILES_UPLOADED",
        file_count: filePaths.length,
      },
      throwHttpErrors: false,
    })
  }

  private async uploadInitialNodeModules() {
    try {
      console.log(kleur.blue("Analyzing node_modules dependencies..."))
      const nodeModuleFiles = getAllNodeModuleFilePaths(
        this.componentFilePath,
        this.projectDir,
      )

      console.log(
        kleur.blue(
          `Found ${nodeModuleFiles.length} node_modules files to upload`,
        ),
      )

      if (nodeModuleFiles.length > 0) {
        await this.uploadNodeModuleFiles(nodeModuleFiles)
      }

      console.log(kleur.green("Node modules uploaded successfully"))
    } catch (error) {
      console.warn(
        kleur.yellow("Warning: Failed to upload some node_modules files:"),
        error,
      )
    }
  }

  /**
   * Uploads a list of node_modules files to the file server
   *
   * @param files - Array of absolute file paths to upload
   */
  private async uploadNodeModuleFiles(files: string[]) {
    for (const nodeModuleFile of files) {
      const relativeFilePath = path.relative(this.projectDir, nodeModuleFile)

      // Mark as uploaded to prevent duplicate uploads
      this.uploadedNodeModules.add(relativeFilePath)

      const filePayload = this.createFileUploadPayload(
        nodeModuleFile,
        relativeFilePath,
      )

      await this.fsKy.post("api/files/upsert", {
        json: {
          file_path: relativeFilePath,
          initiator: "filesystem_change",
          ...filePayload,
        },
      })
    }
  }

  private async saveSnippet() {
    const postEvent = async (
      event: "FAILED_TO_SAVE_SNIPPET" | "SNIPPET_SAVED",
      message?: string,
    ) =>
      this.fsKy.post("api/events/create", {
        json: { event_type: event, ...(message ? { message } : {}) },
        throwHttpErrors: false,
      })

    await pushSnippet({
      filePath: this.componentFilePath,
      onExit: () => {},
      onError: (e) => {
        console.error("Failed to save package:- ", e)
        postEvent("FAILED_TO_SAVE_SNIPPET", e)
      },
      onSuccess: (message: string) => {
        postEvent("SNIPPET_SAVED")
        console.log(message)
      },
    })
  }
  async stop() {
    this.httpServer?.close()
    this.eventsWatcher?.stop()
    await this.filesystemWatcher?.close()
  }

  private createFileUploadPayload(
    absoluteFilePath: string,
    relativeFilePath: string,
  ): FileUploadPayload {
    const ext = path.extname(relativeFilePath).toLowerCase()

    if (BINARY_FILE_EXTENSIONS.has(ext)) {
      const fileBuffer = fs.readFileSync(absoluteFilePath)
      return { binary_content_b64: fileBuffer.toString("base64") }
    }

    return { text_content: fs.readFileSync(absoluteFilePath, "utf-8") }
  }

  private async handleInstallPackage(full_package_name: string) {
    const postEvent = async (
      event: "PACKAGE_INSTALLED" | "PACKAGE_INSTALL_FAILED",
      message?: string,
    ) => {
      await this.fsKy.post("api/events/create", {
        json: { event_type: event, ...(message ? { message } : {}) },
        throwHttpErrors: false,
      })
    }

    try {
      console.log(`Installing package ${full_package_name} via DevServer...`)
      await addPackage(full_package_name, this.projectDir)

      console.log(
        `Package ${full_package_name} installed successfully via DevServer.`,
      )

      await postEvent("PACKAGE_INSTALLED")
    } catch (err) {
      console.error(`Failed to install ${full_package_name}:`, err)

      await postEvent(
        "PACKAGE_INSTALL_FAILED",
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  private handleTokenUpdated(registry_token: string) {
    try {
      setSessionToken(registry_token)
      console.log(
        kleur.green("Session token overridden successfully via runframe"),
      )
    } catch (err) {
      console.error("Failed to update session token:", err)
    }
  }
}
