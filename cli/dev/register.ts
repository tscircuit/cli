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

      await fetch(`http://localhost:${port}/api/files/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: "entrypoint.tsx",
          text_content: `
import MyCircuit from "./snippet.tsx"

circuit.add(<MyCircuit />)
`,
        }),
      })

      // Function to update file content
      const updateFile = async (filePath: string) => {
        try {
          const content = await fs.promises.readFile(filePath, "utf-8")
          const response = await fetch(
            `http://localhost:${port}/api/files/upsert`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                file_path: path.relative(fileDir, filePath),
                text_content: content,
              }),
            },
          )
          if (!response.ok) {
            console.error(`Failed to update ${filePath}`)
          }
        } catch (error) {
          console.error(`Error updating ${filePath}:`, error)
        }
      }

      // Get initial dependencies
      const dependencies = new Set([absolutePath])
      try {
        const deps = getLocalFileDependencies(absolutePath)
        deps.forEach((dep) => dependencies.add(dep))
      } catch (error) {
        console.warn("Failed to analyze dependencies:", error)
      }

      // Watch the main file and its dependencies
      const filesystemWatcher = chokidar.watch(Array.from(dependencies), {
        persistent: true,
        ignoreInitial: false,
      })

      filesystemWatcher.on("change", async (filePath) => {
        console.log(`File ${filePath} changed`)
        await updateFile(filePath)
      })

      filesystemWatcher.on("add", async (filePath) => {
        console.log(`File ${filePath} added`)
        await updateFile(filePath)
      })

      console.log(`Watching ${file} and its dependencies...`)
    })
}
