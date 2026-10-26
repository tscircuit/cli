import { afterEach, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

test.each([
  { standalone: undefined, noInstall: false, shouldInstall: true },
  { standalone: "1", noInstall: false, shouldInstall: false },
  { standalone: "", noInstall: false, shouldInstall: false },
  { standalone: "0", noInstall: false, shouldInstall: false },
  { standalone: undefined, noInstall: true, shouldInstall: false },
])(
  "init with standalone=$standalone and noInstall=$noInstall",
  async ({ standalone, noInstall, shouldInstall }) => {
    const directory = await mkdtemp(join(tmpdir(), "init-standalone-"))
    directories.push(directory)
    const projectDir = join(directory, "project")
    const installLog = join(directory, "install.json")
    const telemetryLog = join(directory, "telemetry.json")
    // Run the real init command in a child so mocks and process.exit are isolated.
    const script = `
      import { mock } from "bun:test"
      import { writeFileSync } from "node:fs"
      import { Command } from ${JSON.stringify(import.meta.resolve("commander"))}
      globalThis.fetch = () => { throw new Error("Unexpected network request") }
      mock.module(${JSON.stringify(import.meta.resolve("lib/shared/get-package-manager"))}, () => ({
        getPackageManager: () => ({ installDeps: async (args) => writeFileSync(${JSON.stringify(installLog)}, JSON.stringify(args)) }),
      }))
      mock.module(${JSON.stringify(import.meta.resolve("lib/shared/check-for-cli-update"))}, () => ({ checkForTsciUpdates: async () => false }))
      mock.module(${JSON.stringify(import.meta.resolve("lib/telemetry"))}, () => ({
        captureTelemetryEvent: async (_, properties) => writeFileSync(${JSON.stringify(telemetryLog)}, JSON.stringify(properties)),
      }))
      const { registerInit } = await import(${JSON.stringify(import.meta.resolve("cli/init/register"))})
      const program = new Command()
      registerInit(program)
      await program.parseAsync(${JSON.stringify(["init", projectDir, "--yes", ...(noInstall ? ["--no-install"] : [])])}, { from: "user" })
    `
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      TSCIRCUIT_CONFIG_DIR: join(directory, "config"),
      TSCI_SKIP_SKILL_SETUP: "true",
    }
    delete env.TSCIRCUIT_STANDALONE
    delete env.TSCIRCUIT_TOKEN
    if (standalone !== undefined) env.TSCIRCUIT_STANDALONE = standalone
    const child = Bun.spawn([process.execPath, "--eval", script], {
      env,
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])

    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
    expect(stdout).toContain("Initialization complete!")
    expect(existsSync(installLog)).toBe(shouldInstall)
    expect(JSON.parse(await readFile(telemetryLog, "utf8")).no_install).toBe(
      !shouldInstall,
    )
    expect(existsSync(join(projectDir, "index.circuit.tsx"))).toBe(true)
    expect(existsSync(join(projectDir, "tsconfig.json"))).toBe(true)
    expect(
      JSON.parse(await readFile(join(projectDir, "package.json"), "utf8")),
    ).toMatchObject({ scripts: { dev: "tsci dev", start: "tsci dev" } })
  },
)
