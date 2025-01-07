import type { Command } from "commander"
import * as path from "node:path"
import * as chokidar from "chokidar"
import * as fs from "node:fs"
import { createHttpServer } from "lib/server/createHttpServer"
import { getLocalFileDependencies } from "lib/dependency-analysis/getLocalFileDependencies"
import { installNodeModuleTypesForSnippet } from "../../lib/dependency-analysis/installNodeModuleTypesForSnippet"
import { EventsWatcher } from "../../lib/server/EventsWatcher"
import { DevServer } from "./DevServer"

export const registerDev = (program: Command) => {
  program
    .command("dev")
    .description("Start development server for a snippet")
    .argument("<file>", "Path to the snippet file")
    .option("-p, --port <number>", "Port to run server on", "3000")
    .action(async (file: string, options: { port: string }) => {
      const absolutePath = path.resolve(file)
      const fileDir = path.dirname(absolutePath)
      const port = parseInt(options.port)

      try {
        console.log("Installing types for imported snippets...")
        await installNodeModuleTypesForSnippet(absolutePath)
        console.log("Types installed successfully")
      } catch (error) {
        console.warn("Failed to install types:", error)
      }

      const server = new DevServer({
        port,
        entrypoint: absolutePath,
      })

      await server.start()

      await server.fsKy.post("api/files/upsert", {
        json: {
          file_path: "entrypoint.tsx",
          text_content: `
import MyCircuit from "./snippet.tsx"

circuit.add(<MyCircuit />)
`,
        },
      })
    })
}
