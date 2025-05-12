import ky from "ky"
import type { FileServerRoutes } from "lib/file-server/FileServerRoutes"
import { createHttpServer } from "lib/server/createHttpServer"
import { EventsWatcher } from "lib/server/EventsWatcher"
import type http from "node:http"
import type { TypedKyInstance } from "typed-ky"
import path from "node:path"
import fs from "node:fs"
import type { FileUpdatedEvent } from "../../lib/file-server/FileServerEvent"
import * as chokidar from "chokidar"
import { FilesystemTypesHandler } from "lib/dependency-analysis/FilesystemTypesHandler"
import { pushSnippet } from "lib/shared/push-snippet"
import { globbySync } from "globby"
import { ExportFormat, exportSnippet } from "lib/shared/export-snippet"
import { getPackageFilePaths } from "./get-package-file-paths"
import { addPackage } from "lib/shared/add-package"
import Debug from "debug"

const debug = Debug("tscircuit:devserver")

export class DevServer {
  port: number
  /**
   * The path to a component that exports a <board /> or <group /> component
   */
  componentFilePath: string

  projectDir: string

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

  private typesHandler?: FilesystemTypesHandler

  constructor({
    port,
    componentFilePath,
  }: {
    port: number
    componentFilePath: string
  }) {
    this.port = port
    this.componentFilePath = componentFilePath
    this.projectDir = path.dirname(componentFilePath)
    this.fsKy = ky.create({
      prefixUrl: `http://localhost:${port}`,
    }) as any
    this.typesHandler = new FilesystemTypesHandler(this.projectDir)
  }

  async start() {
    const { server } = await createHttpServer(this.port)
    this.httpServer = server

    this.eventsWatcher = new EventsWatcher(`http://localhost:${this.port}`)
    this.eventsWatcher.start()

    this.eventsWatcher.on(
      "FILE_UPDATED",
      this.handleFileUpdatedEventFromServer.bind(this),
    )

    this.eventsWatcher.on(
      "REQUEST_TO_SAVE_SNIPPET",
      this.saveSnippet.bind(this),
    )

    this.eventsWatcher.on("INSTALL_PACKAGE", (event) =>
      this.handleInstallPackage(event.full_package_name),
    )

    this.filesystemWatcher = chokidar.watch(this.projectDir, {
      persistent: true,
      ignoreInitial: true,
      ignored: ["**/node_modules/**", "**/.git/**"],
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

    this.typesHandler?.handleInitialTypeDependencies(this.componentFilePath)
  }

  async handleFileUpdatedEventFromServer(ev: FileUpdatedEvent) {
    if (ev.initiator === "filesystem_change") return

    if (ev.file_path === "manual-edits.json") {
      console.log("Manual edits updated, updating on filesystem...")
      const { file } = await this.fsKy
        .get("api/files/get", {
          searchParams: { file_path: ev.file_path },
        })
        .json()
      fs.writeFileSync(
        path.join(this.projectDir, "manual-edits.json"),
        file.text_content,
      )
    }
  }

  async handleFileChangedOnFilesystem(absoluteFilePath: string) {
    const relativeFilePath = path.relative(this.projectDir, absoluteFilePath)
    // We've temporarily disabled upserting manual edits from filesystem changes
    // because it can be edited by the browser
    if (relativeFilePath.includes("manual-edits.json")) return

    await this.typesHandler?.handleFileTypeDependencies(absoluteFilePath)

    console.log(`${relativeFilePath} saved. Applying changes...`)
    await this.fsKy
      .post("api/files/upsert", {
        json: {
          file_path: relativeFilePath,
          text_content: fs.readFileSync(absoluteFilePath, "utf-8"),
          initiator: "filesystem_change",
        },
      })
      .json()
  }

  async handleFileRemovedFromFilesystem(absoluteFilePath: string) {
    const relativeFilePath = path.relative(this.projectDir, absoluteFilePath)
    await this.fsKy.post("api/files/delete", {
      json: {
        file_path: relativeFilePath,
        initiator: "filesystem_change",
      },
    })
  }

  async handleFileRename(oldPath: string, newPath: string) {
    const oldRelativePath = path.relative(this.projectDir, oldPath)
    const newRelativePath = path.relative(this.projectDir, newPath)
    // First delete the old file from the file server
    await this.fsKy.post("api/files/delete", {
      json: {
        file_path: oldRelativePath,
        initiator: "filesystem_change",
      },
    })

    // Then upsert the new file
    const fileContent = fs.readFileSync(newPath, "utf-8")
    await this.fsKy.post("api/files/upsert", {
      json: {
        file_path: newRelativePath,
        text_content: fileContent,
        initiator: "filesystem_change",
      },
    })

    debug(`File renamed from ${oldRelativePath} to ${newRelativePath}`)
  }

  async upsertInitialFiles() {
    const filePaths = getPackageFilePaths(this.projectDir)

    for (const filePath of filePaths) {
      const fileContent = fs.readFileSync(filePath, "utf-8")
      await this.fsKy.post("api/files/upsert", {
        json: {
          file_path: path.relative(this.projectDir, filePath),
          text_content: fileContent,
          initiator: "filesystem_change",
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
        console.error("Failed to save snippet:- ", e)
        postEvent("FAILED_TO_SAVE_SNIPPET", e)
      },
      onSuccess: () => {
        postEvent("SNIPPET_SAVED")
      },
    })
  }
  async stop() {
    this.httpServer?.close()
    this.eventsWatcher?.stop()
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
}
