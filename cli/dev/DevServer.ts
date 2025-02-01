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
import { FilesystemTypesHandler } from "lib/dependency-analysis/FilesystemTypesHandler"
import { WebSocketServer } from "ws"

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
  private wsServer?: WebSocketServer
  private isRendering: boolean = false

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
    console.log("Starting server, please wait...")
    const { server } = await createHttpServer(this.port)
    this.httpServer = server

    this.wsServer = new WebSocketServer({ server })
    this.wsServer.on("connection", (ws) => {
      ws.send("Server connected")
    })

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

    this.filesystemWatcher.on("change", async (filePath) => {
      await this.handleFileChanged(filePath)
    })
    this.filesystemWatcher.on("add", async (filePath) => {
      await this.handleFileChanged(filePath)
    })

    this.upsertInitialFiles()

    this.typesHandler?.handleInitialTypeDependencies(this.componentFilePath)
    console.log("Server started successfully")
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

  async handleFileChanged(filePath: string) {
    if (this.isRendering) return
    this.isRendering = true

    console.log("circuit is rendering...")
    this.notifyBrowser("circuit is rendering...")
    await this.handleFileChangedOnFilesystem(filePath)

    console.log("circuit is ready")
    this.notifyBrowser("circuit is ready")

    this.isRendering = false
  }

  async handleFileChangedOnFilesystem(absoluteFilePath: string) {
    const relativeFilePath = path.relative(this.projectDir, absoluteFilePath)
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

  notifyBrowser(message: string) {
    console.log(`Sending message to browser: ${message}`)
    this.wsServer?.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  async upsertInitialFiles() {
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
    this.wsServer?.close()
  }
}
