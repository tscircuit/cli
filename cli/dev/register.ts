import type { Command } from "commander"
import * as fs from "node:fs"
import * as net from "node:net"
import * as path from "node:path"
import Debug from "debug"
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const findAvailablePort = async ({
  preferredPort,
  timeoutMs,
  verbose,
}: {
  preferredPort: number
  timeoutMs: number
  verbose: boolean
}): Promise<{ port: number; attempts: number }> => {
  let port = preferredPort
  const start = Date.now()
  let attempts = 0

  while (true) {
    const available = await isPortAvailable(port)
    if (available) return { port, attempts }

    attempts += 1
    if (verbose) {
      console.log(
        kleur.gray(
          `Port ${port} is in use, trying port ${port + 1}... (attempt ${attempts})`,
        ),
      )
    }

    if (Date.now() - start >= timeoutMs) {
      throw new Error(
        `Unable to find an open port within ${timeoutMs}ms starting from ${preferredPort}. Last tried port ${port}. Try specifying a different --port or increasing --port-timeout.`,
      )
    }

    port += 1
    await sleep(150)
  }
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

const enableDevVerboseLogging = () => {
  const namespace = "tscircuit:devserver"
  const existingNamespaces = (process.env.DEBUG ?? "")
    .split(/[\s,]+/)
    .map((ns) => ns.trim())
    .filter(Boolean)

  if (!existingNamespaces.includes(namespace)) {
    existingNamespaces.push(namespace)
  }

  const mergedNamespaces = existingNamespaces.join(",")

  Debug.enable(mergedNamespaces || namespace)
  process.env.DEBUG = mergedNamespaces || namespace

  console.log(
    kleur.gray(
      `Verbose debug logging enabled (DEBUG=${mergedNamespaces || namespace})`,
    ),
  )
}

// Exported for testing to verify DEBUG namespace wiring
export const enableDevVerboseLoggingForTest = enableDevVerboseLogging
export const findAvailablePortForTest = findAvailablePort

export const registerDev = (program: Command) => {
  program
    .command("dev")
    .description("Start development server for a package")
    .argument("[file]", "Path to the package file or directory")
    .option("-p, --port <number>", "Port to run server on", "3020")
    .option(
      "--port-timeout <ms>",
      "Maximum time in ms to search for an open port",
      "10000",
    )
    .option("--kicad-pcm", "Enable KiCad PCM proxy server at /pcm/*")
    .option("-v, --verbose", "Enable verbose debug logging")
    .action(
      async (
        file: string,
        options: {
          port: string
          portTimeout?: string
          kicadPcm?: boolean
          verbose?: boolean
        },
      ) => {
        let port = parseInt(options.port)
        const portTimeout = parseInt(options.portTimeout ?? "10000")
        const startTime = Date.now()

        if (options.verbose) {
          enableDevVerboseLogging()
        }

        const { port: resolvedPort } = await findAvailablePort({
          preferredPort: port,
          timeoutMs: portTimeout,
          verbose: !!options.verbose,
        })
        port = resolvedPort

        const target = await resolveDevTarget(file)
        if (!target) return

        const { absolutePath, projectDir } = target

        warnIfTsconfigMissingTscircuitType(projectDir)

        const server = new DevServer({
          port,
          componentFilePath: absolutePath,
          projectDir,
          kicadPcm: options.kicadPcm,
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

        if (options.kicadPcm) {
          console.log(
            `\n  ${kleur.bold("➜ Auto-updating KiCad PCM Server:")} ${kleur.underline(kleur.cyan(`http://localhost:${port}/pcm/repository.json`))}\n`,
          )
        }
      },
    )
}
