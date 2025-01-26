import ky from "ky"
import type { FileServerRoutes } from "lib/file-server/FileServerRoutes"
import { createHttpServer } from "lib/server/createHttpServer"
import { EventsWatcher } from "lib/server/EventsWatcher"
import type http from "node:http"
import type { TypedKyInstance } from "typed-ky"
import path from "node:path"
import fs from "node:fs"
import type { FileUpdatedEvent } from "lib/file-server/FileServerEvent"
import * as chokidar from "chokidar"
import { installNodeModuleTypesForSnippet } from "lib/dependency-analysis/installNodeModuleTypesForSnippet"
import { findImportsInSnippet } from "lib/dependency-analysis/findImportsInSnippet"

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

    this.filesystemWatcher = chokidar.watch(this.projectDir, {
      persistent: true,
      ignoreInitial: true,
    })

    this.filesystemWatcher.on("change", (filePath) =>
      this.handleFileChangedOnFilesystem(filePath),
    )
    this.filesystemWatcher.on("add", (filePath) =>
      this.handleFileChangedOnFilesystem(filePath),
    )

    this.upsertInitialFiles()

    await this.handleTypeDependencies(this.componentFilePath)
  }

  async addEntrypoint() {
    const relativeComponentFilePath = path.relative(
      this.projectDir,
      this.componentFilePath,
    )
    await this.fsKy.post("api/files/upsert", {
      json: {
        file_path: "entrypoint.tsx",
        text_content: `
import MyCircuit from "./${relativeComponentFilePath}"

circuit.add(<MyCircuit />)
`,
      },
    })
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

    try {
      if (!this.areTypesInstalled(absoluteFilePath)) {
        console.log("Types outdated, installing...")
        await installNodeModuleTypesForSnippet(absoluteFilePath)
      }
    } catch (error) {
      console.warn("Failed to verify types:", error)
    }

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

  async upsertInitialFiles() {
    // Scan project directory for all files and upsert them
    const fileNames = fs.readdirSync(this.projectDir)
    for (const fileName of fileNames) {
      if (fs.statSync(path.join(this.projectDir, fileName)).isDirectory())
        continue
      const fileContent = fs.readFileSync(
        path.join(this.projectDir, fileName),
        "utf-8",
      )
      await this.fsKy.post("api/files/upsert", {
        json: {
          file_path: fileName,
          text_content: fileContent,
          initiator: "filesystem_change",
        },
      })
    }
  }

  async stop() {
    this.httpServer?.close()
    this.eventsWatcher?.stop()
  }

  private async handleTypeDependencies(absoluteFilePath: string) {
    console.log("Checking type dependencies...")
    try {
      const needsInstallation = !this.areTypesInstalled(absoluteFilePath)
      if (needsInstallation) {
        console.log("Installing missing types...")
        await installNodeModuleTypesForSnippet(absoluteFilePath)
      }
    } catch (error) {
      console.warn("Error handling type dependencies:", error)
    }
  }

  private areTypesInstalled(absoluteFilePath: string): boolean {
    const imports = findImportsInSnippet(absoluteFilePath)
    return imports.every((imp) => this.checkTypeExists(imp))
  }

  private checkTypeExists(importPath: string): boolean {
    if (!importPath.startsWith("@tsci/")) return true

    let projectRoot = this.projectDir
    while (projectRoot !== path.parse(projectRoot).root) {
      if (fs.existsSync(path.join(projectRoot, "package.json"))) {
        break
      }
      projectRoot = path.dirname(projectRoot)
    }

    const pathWithoutPrefix = importPath.replace("@tsci/", "")
    const [owner, name] = pathWithoutPrefix.split(".")

    const typePath = path.join(
      projectRoot,
      "node_modules",
      "@tsci",
      `${owner}.${name}`,
      "index.d.ts",
    )

    return fs.existsSync(typePath)
  }
}
