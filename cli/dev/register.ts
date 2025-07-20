import type { Command } from "commander"
import * as fs from "node:fs"
import * as net from "node:net"
import * as path from "node:path"
import { installNodeModuleTypesForSnippet } from "../../lib/dependency-analysis/installNodeModuleTypesForSnippet"
import { DevServer } from "./DevServer"
import kleur from "kleur"
import { getVersion } from "lib/getVersion"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { getPackageFilePaths } from "./get-package-file-paths"
import prompts from "lib/utils/prompts"

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

      const entrypointPath = await getEntrypoint({
        filePath: file,
        onSuccess: () => {},
        onError: () => {
          console.log(kleur.red("No entrypoint found"))
        },
      })
      if (entrypointPath && fs.existsSync(entrypointPath)) {
        absolutePath = entrypointPath
        console.log(
          "\n" +
            kleur.green("Found entrypoint at: ") +
            kleur.cyan(path.relative(process.cwd(), entrypointPath)) +
            "\n",
        )
      } else {
        console.log(kleur.yellow("Showing available files in directory:"))

        const projectDir = process.cwd()
        const filePaths = getPackageFilePaths(projectDir)

        if (filePaths.length === 0) {
          console.log(
            kleur.red(
              "No files found in directory. Run 'tsci init' to bootstrap a basic project.",
            ),
          )
          return
        }

        const choices = filePaths
          .filter(
            (x) =>
              (x.endsWith(".jsx") ||
                x.endsWith(".tsx") ||
                x.endsWith(".js") ||
                x.endsWith(".ts")) &&
              !x.endsWith(".d.ts"),
          )
          .map((filePath) => ({
            title: path.relative(projectDir, filePath),
            description: `File: ${path.basename(filePath)}`,
            value: filePath,
          }))

        const { selectedFile } = await prompts({
          type: "select",
          name: "selectedFile",
          message: "Select a file to use as entrypoint:",
          choices,
          initial: 0,
        })

        if (!selectedFile) {
          console.log(kleur.yellow("No file selected."))
          return
        }

        absolutePath = selectedFile
        console.log(
          "\n" +
            kleur.green("Using selected file: ") +
            kleur.cyan(path.relative(process.cwd(), absolutePath)) +
            "\n",
        )
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
