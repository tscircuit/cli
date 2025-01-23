import type { Command } from "commander"
import * as path from "node:path"
import * as chokidar from "chokidar"
import * as fs from "node:fs"
import { createHttpServer } from "lib/server/createHttpServer"
import { getLocalFileDependencies } from "lib/dependency-analysis/getLocalFileDependencies"
import { installNodeModuleTypesForSnippet } from "../../lib/dependency-analysis/installNodeModuleTypesForSnippet"
import { EventsWatcher } from "../../lib/server/EventsWatcher"
import { DevServer } from "./DevServer"
import * as net from "node:net"

export const registerDev = (program: Command) => {
  program
    .command("dev")
    .description("Start development server for a snippet")
    .argument("[file]", "Path to the snippet file")
    .option("-p, --port <number>", "Port to run server on", "3020")
    .action(async (file: string, options: { port: string }) => {
      let port = parseInt(options.port)

      const isPortAvailable = (port: number): Promise<boolean> => {
        return new Promise((resolve) => {
          const server = net.createServer()
          server.once("error", () => resolve(false))
          server.once("listening", () => {
            server.close(() => resolve(true))
          })
          server.listen(port)
        })
      }

      while (!(await isPortAvailable(port))) {
        console.log(`Port ${port} is in use, trying port ${port + 1}...`)
        port += 1
      }

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

      await server.start()
      await server.addEntrypoint()
    })
}
