#!/usr/bin/env node
import { Command } from "commander"
import * as path from "path"
import * as chokidar from "chokidar"
import * as fs from "fs"
import { createServer } from "../lib/server/createServer"
import { getLocalFileDependencies } from "../lib/dependency-analysis/getLocalFileDependencies"

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

    // Start the server
    await createServer(port)

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
    let dependencies = new Set([absolutePath])
    try {
      const deps = getLocalFileDependencies(absolutePath)
      deps.forEach((dep) => dependencies.add(dep))
    } catch (error) {
      console.warn("Failed to analyze dependencies:", error)
    }

    // Watch the main file and its dependencies
    const watcher = chokidar.watch(Array.from(dependencies), {
      persistent: true,
      ignoreInitial: false,
    })

    watcher.on("change", async (filePath) => {
      console.log(`File ${filePath} changed`)
      await updateFile(filePath)
    })

    watcher.on("add", async (filePath) => {
      console.log(`File ${filePath} added`)
      await updateFile(filePath)
    })

    console.log(`Watching ${file} and its dependencies...`)
  })

program.parse()
