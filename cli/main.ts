#!/usr/bin/env node
import { Command } from "commander"
import * as path from "node:path"
import * as chokidar from "chokidar"
import * as fs from "node:fs"
import { createServer } from "../lib/server/createServer"
import { getLocalFileDependencies } from "../lib/dependency-analysis/getLocalFileDependencies"
import { installTypes } from "./installTypes"
import { EventsWatcher } from "../lib/server/EventsWatcher"

const program = new Command()

program
  .name("snippets")
  .description("CLI for developing tscircuit snippets")
  .version("1.0.0")

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
      await installTypes(absolutePath)
      console.log("Types installed successfully")
    } catch (error) {
      console.warn("Failed to install types:", error)
    }

    // Start the server
    await createServer(port)

    const eventsWatcher = new EventsWatcher(`http://localhost:${port}`)
    eventsWatcher.start()

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

    eventsWatcher.on("FILE_UPDATED", async (ev) => {
      if (ev.file_path === "manual-edits.json") {
        console.log("Manual edits updated, updating on filesystem...")
        const { file } = await fetch(
          `http://localhost:${port}/api/files/get?file_path=manual-edits.json`,
        ).then((r) => r.json())
        fs.writeFileSync(
          path.join(fileDir, "manual-edits.json"),
          file.text_content,
        )
      }
    })

    console.log(`Watching ${file} and its dependencies...`)
  })

program.parse()
