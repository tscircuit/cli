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
    .argument("[file]", "Path to the snippet file")
    .option("-p, --port <number>", "Port to run server on", "3020")
    .action(async (file: string, options: { port: string }) => {
      const port = parseInt(options.port)
      let absolutePath: string

      if (file) {
        absolutePath = path.resolve(file)
      } else {
        const entrypointPath = path.resolve("index.tsx")
        if (fs.existsSync(entrypointPath)) {
          absolutePath = entrypointPath
          console.log("No file provided. Using 'index.tsx' as the entrypoint.")
        } else {
          console.log(
            "No entrypoint found. Run 'tsci init' to bootstrap a basic project.",
          )
          return
        }
      }

      const fileDir = path.dirname(absolutePath)

      try {
        console.log("Installing types for imported snippets...")
        await installNodeModuleTypesForSnippet(absolutePath)
        console.log("Types installed successfully")
      } catch (error) {
        console.warn("Failed to install types:", error)
      }

      const server = new DevServer({
        port,
        componentFilePath: absolutePath,
      })

      try {
        await server.start()
        await server.addEntrypoint()
      } catch (error) {
        console.error("Failed to start server:", (error as Error).message)
        process.exit(1)
      }
    })
}
