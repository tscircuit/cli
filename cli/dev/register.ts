import type { Command } from "commander"
import * as fs from "node:fs"
import * as net from "node:net"
import * as path from "node:path"
import { DevServer } from "./DevServer"
import kleur from "kleur"
import { getVersion } from "lib/getVersion"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { globbySync } from "globby"
import { findBoardFiles } from "lib/shared/find-board-files"
import { DEFAULT_IGNORED_PATTERNS } from "lib/shared/should-ignore-path"

const findSelectableFiles = (projectDir: string): string[] => {
  const boardFiles = findBoardFiles({ projectDir })
    .filter((file) => fs.existsSync(file))
    .sort()

  if (boardFiles.length > 0) {
    return boardFiles
  }

  const files = globbySync(["**/*.tsx", "**/*.ts", "**/*.circuit.json"], {
    cwd: projectDir,
    ignore: DEFAULT_IGNORED_PATTERNS,
  })

  return files
    .map((file) => path.resolve(projectDir, file))
    .filter((file) => fs.existsSync(file))
    .sort()
}

const warnIfTsconfigMissingTscircuitType = (projectDir: string) => {
  const tsconfigPath = path.join(projectDir, "tsconfig.json")
  if (!fs.existsSync(tsconfigPath)) {
    return
  }

  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"))
    const types = tsconfig?.compilerOptions?.types
    if (!Array.isArray(types) || !types.includes("tscircuit")) {
      console.warn(
        kleur.yellow(
          'Warning: "tscircuit" is missing from tsconfig.json compilerOptions.types. Add it (e.g. "types": ["tscircuit"]) to ensure CLI-provided types work correctly.',
        ),
      )
    }
  } catch {
    // ignore JSON parse errors here; other parts of the CLI will surface them if needed
  }
}

export const registerDev = (program: Command) => {
  program
    .command("dev")
    .description("Start development server for a package")
    .argument("[file]", "Path to the package file or directory")
    .option("-p, --port <number>", "Port to run server on", "3020")
    .action(async (file: string, options: { port: string }) => {
      let port = parseInt(options.port)
      const startTime = Date.now()

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
        console.log(
          kleur.gray(`Port ${port} is in use, trying port ${port + 1}...`),
        )
        port += 1
      }

      let absolutePath: string
      let projectDir = process.cwd()

      if (file) {
        const resolvedPath = path.resolve(file)

        if (
          fs.existsSync(resolvedPath) &&
          fs.statSync(resolvedPath).isDirectory()
        ) {
          // Use the directory as the project directory
          projectDir = resolvedPath

          const availableFiles = findSelectableFiles(projectDir)

          if (availableFiles.length === 0) {
            console.log(
              `No .tsx, .ts, or .circuit.json files found in ${projectDir}. Run 'tsci init' to bootstrap a basic project.`,
            )
            return
          }
          absolutePath = availableFiles[0]
          console.log("Selected file:", path.relative(projectDir, absolutePath))
        } else {
          // It's a file path
          absolutePath = resolvedPath

          if (!fs.existsSync(absolutePath)) {
            console.error(`Error: File not found: ${file}`)
            return
          }

          const isValidFile =
            absolutePath.endsWith(".tsx") ||
            absolutePath.endsWith(".ts") ||
            absolutePath.endsWith(".circuit.json")

          if (!isValidFile) {
            console.error(
              "Error: Only .tsx, .ts, and .circuit.json files are supported",
            )
            return
          }
        }
      } else {
        const entrypointPath = await getEntrypoint({
          onError: () => {},
        })
        if (entrypointPath && fs.existsSync(entrypointPath)) {
          absolutePath = entrypointPath
          console.log("Found entrypoint at:", entrypointPath)
        } else {
          // Find all selectable files in the project
          const availableFiles = findSelectableFiles(projectDir)

          if (availableFiles.length === 0) {
            console.log(
              "No .tsx, .ts, or .circuit.json files found in the project. Run 'tsci init' to bootstrap a basic project.",
            )
            return
          }
          absolutePath = availableFiles[0]
          console.log("Selected file:", path.relative(projectDir, absolutePath))
        }
      }

      warnIfTsconfigMissingTscircuitType(projectDir)

      const server = new DevServer({
        port,
        componentFilePath: absolutePath,
        projectDir,
      })

      await server.start()

      const timeToStart = Date.now() - startTime

      console.log(
        `\n\n  ${kleur.green(`@tscircuit/cli@${getVersion()}`)} ${kleur.gray("ready in")} ${kleur.white(`${Math.round(timeToStart)}ms`)}`,
      )
      console.log(
        `\n  ${kleur.bold("➜ Local:")}   ${kleur.underline(kleur.cyan(`http://localhost:${port}`))}${server.componentFilePath ? kleur.underline(kleur.cyan(`/#file=${encodeURIComponent(path.relative(process.cwd(), server.componentFilePath).replaceAll("\\", "/"))}`)) : ""}\n\n`,
      )
      console.log(
        kleur.gray(
          `Watching ${kleur.underline(server.projectDir.split("/").slice(-2).join("/")!)} for changes...`,
        ),
      )
    })
}
