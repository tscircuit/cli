import type { Command } from "commander"
import * as fs from "node:fs"
import * as net from "node:net"
import * as path from "node:path"
import { DevServer } from "./DevServer"
import { resolveDevTarget } from "./resolve-dev-target"
import kleur from "kleur"
import { getVersion } from "lib/getVersion"

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

      while (!(await isPortAvailable(port))) {
        console.log(
          kleur.gray(`Port ${port} is in use, trying port ${port + 1}...`),
        )
        port += 1
      }

      const target = await resolveDevTarget(file)
      if (!target) return

      const { absolutePath, projectDir } = target

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
