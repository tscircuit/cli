import type { Command } from "commander"
import * as fs from "node:fs"
import * as net from "node:net"
import * as path from "node:path"
import { installNodeModuleTypesForSnippet } from "../../lib/dependency-analysis/installNodeModuleTypesForSnippet"
import { DevServer } from "./DevServer"
import kleur from "kleur"
import { getVersion } from "lib/getVersion"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { globbySync } from "globby"
import { DEFAULT_IGNORED_PATTERNS } from "lib/shared/should-ignore-path"

const findSelectableTsxFiles = (projectDir: string): string[] => {
  const files = globbySync(["**/*.tsx", "**/*.ts"], {
    cwd: projectDir,
    ignore: DEFAULT_IGNORED_PATTERNS,
  })

  return files
    .map((file) => path.resolve(projectDir, file))
    .filter((file) => fs.existsSync(file))
    .sort()
}

export const registerDev = (program: Command) => {
  program
    .command("dev")
    .description("Start development server for a package")
    .argument("[file]", "Path to the package file")
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

      if (file) {
        absolutePath = path.resolve(file)
        if (!absolutePath.endsWith(".tsx") && !absolutePath.endsWith(".ts")) {
          console.error("Error: Only .tsx files are supported")
          return
        }
      } else {
        const entrypointPath = await getEntrypoint({
          onError: () => {},
        })
        if (entrypointPath && fs.existsSync(entrypointPath)) {
          absolutePath = entrypointPath
          console.log("Found entrypoint at:", entrypointPath)
        } else {
          // Find all .tsx files in the project
          const availableFiles = findSelectableTsxFiles(process.cwd())

          if (availableFiles.length === 0) {
            console.log(
              "No .tsx or .ts files found in the project. Run 'tsci init' to bootstrap a basic project.",
            )
            return
          }
          absolutePath = availableFiles[0]
          console.log(
            "Selected file:",
            path.relative(process.cwd(), absolutePath),
          )
        }
      }

      try {
        process.stdout.write(
          kleur.gray("Installing types for imported packages..."),
        )
        await installNodeModuleTypesForSnippet(absolutePath)
        console.log(kleur.green(" done"))
      } catch (error) {
        console.warn("Failed to install types:", error)
      }

      const server = new DevServer({
        port,
        componentFilePath: absolutePath,
        projectDir: process.cwd(),
      })

      await server.start()

      const timeToStart = Date.now() - startTime

      console.log(
        `\n\n  ${kleur.green(`@tscircuit/cli@${getVersion()}`)} ${kleur.gray("ready in")} ${kleur.white(`${Math.round(timeToStart)}ms`)}`,
      )
      console.log(
        `\n  ${kleur.bold("➜ Local:")}   ${kleur.underline(kleur.cyan(`http://localhost:${port}`))}\n\n`,
      )
      console.log(
        kleur.gray(
          `Watching ${kleur.underline(server.projectDir.split("/").slice(-2).join("/")!)} for changes...`,
        ),
      )
    })
}
