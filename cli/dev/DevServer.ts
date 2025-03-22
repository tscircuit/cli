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
import { applyPcbEditEventsToManualEditsFile } from "@tscircuit/core"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"

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

    this.eventsWatcher.on(
      "USER_CREATED_MANUAL_EDIT",
      this.handleManualEditEvent.bind(this),
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

    this.upsertInitialFiles()

    this.typesHandler?.handleInitialTypeDependencies(this.componentFilePath)
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

  async upsertInitialFiles() {
    // Scan project directory for relevant files and upsert them
    const fileNames = globbySync("**", {
      cwd: this.projectDir,
      ignore: ["**/node_modules/**", "**/.git/**"],
    })

    for (const fileName of fileNames) {
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
      onExit: () => { },
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

  private async handleManualEditEvent(ev: any) {
    const { circuitJson } = await generateCircuitJson({
      filePath: this.componentFilePath,
      saveToFile: false,
    })
    const manualEditsPath = path.join(this.projectDir, "manual-edits.json")
    let manualEdits = {}

    try {
      if (fs.existsSync(manualEditsPath)) {
        const content = fs.readFileSync(manualEditsPath, "utf-8")
        manualEdits = JSON.parse(content)
      }
    } catch (error) {
      console.error("Error reading manual-edits.json:", error)
    }


    const updatedEdits = applyPcbEditEventsToManualEditsFile({
      circuitJson,
      editEvents: [ev],
      manualEditsFile: manualEdits ?? {},
    })

    console.log("Updated edits:", updatedEdits)

    fs.writeFileSync(manualEditsPath, JSON.stringify(updatedEdits, null, 2))

    await this.fsKy.post("api/files/upsert", {
      json: {
        file_path: "manual-edits.json",
        text_content: JSON.stringify(updatedEdits, null, 2),
        initiator: "filesystem_change",
      },
    })
  }
}
