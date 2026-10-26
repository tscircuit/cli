import { afterEach, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
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
  { flag: undefined, noInstall: false, installCalls: 1 },
  { flag: "false", noInstall: false, installCalls: 1 },
  { flag: "true", noInstall: false, installCalls: 0 },
  { flag: undefined, noInstall: true, installCalls: 0 },
])(
  "project setup with skip flag $flag and noInstall=$noInstall",
  async ({ flag, noInstall, installCalls }) => {
    const directory = await mkdtemp(join(tmpdir(), "setup-tsci-"))
    directories.push(directory)
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ name: "test-project", scripts: { test: "existing" } }),
    )
    // Isolate the package-manager mock and process.chdir from other tests.
    const script = `
      import { mock } from "bun:test"
      const installs = []
      mock.module(${JSON.stringify(import.meta.resolve("lib/shared/get-package-manager"))}, () => ({
        getPackageManager: () => ({ installDeps: async (args) => { installs.push(args) } }),
      }))
      const { setupTsciProject } = await import(${JSON.stringify(import.meta.resolve("lib/shared/setup-tsci-packages"))})
      const name = await setupTsciProject(${JSON.stringify(directory)}${noInstall ? ", []" : ""})
      console.log(JSON.stringify({ name, installs }))
    `
    const env = { ...process.env }
    delete env.TSCI_SKIP_DEPENDENCY_INSTALL
    if (flag !== undefined) env.TSCI_SKIP_DEPENDENCY_INSTALL = flag
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
    const result = JSON.parse(stdout.trim().split("\n").at(-1)!)
    expect(result.name).toBe("test-project")
    expect(result.installs).toHaveLength(installCalls)
    if (installCalls) {
      expect(result.installs[0]).toEqual({
        deps: ["@types/react", "tscircuit"],
        cwd: directory,
        dev: true,
      })
    }
    expect(
      JSON.parse(await readFile(join(directory, "package.json"), "utf8")),
    ).toMatchObject({
      scripts: { test: "existing", dev: "tsci dev", start: "tsci dev" },
    })
  },
)
