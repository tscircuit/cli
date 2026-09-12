import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const cliPath = path.resolve(import.meta.dir, "../../../cli/main.ts")

test("help, version and non-transpiling builds work without the TypeScript compiler API", async () => {
  const projectDir = await mkdtemp(path.join(tmpdir(), "tsci-typescript7-"))
  try {
    // TypeScript 7's main entry point only exports version information.
    // Isolate the mock in child processes so other tests retain their compiler.
    const preloadPath = path.join(projectDir, "typescript7-preload.ts")
    await writeFile(
      preloadPath,
      `import { mock } from "bun:test"
const ts = { version: "7.0.2", versionMajorMinor: "7.0" }
mock.module(${JSON.stringify(import.meta.resolve("typescript"))}, () => ({ ...ts, default: ts }))
`,
    )
    // importFromUserLand falls back to the CLI's own React/tscircuit packages
    // when the project has no local node_modules.
    await writeFile(path.join(projectDir, "package.json"), "{}")
    await writeFile(
      path.join(projectDir, "index.tsx"),
      `export default () => <board width={10} height={10}>
  <resistor name="R1" resistance="1k" footprint="0603" />
</board>`,
    )

    const run = async (...args: string[]) => {
      const child = Bun.spawn(
        [process.execPath, "--preload", preloadPath, cliPath, ...args],
        {
          cwd: projectDir,
          env: { ...process.env, TSCI_TEST_MODE: "true", FORCE_COLOR: "0" },
          stdout: "pipe",
          stderr: "pipe",
        },
      )
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      return { exitCode, stdout, stderr }
    }

    const expectIncompatibleCompiler = (
      result: Awaited<ReturnType<typeof run>>,
    ) => {
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("TypeScript 7.0.2")
      expect(result.stderr).toContain("JavaScript compiler API")
      expect(result.stderr).toContain("typescript@5.9.3")
      expect(result.stderr).not.toContain("ModuleKind.ES2015")
    }

    for (const arg of ["--help", "--version"]) {
      const result = await run(arg)
      expect(result.exitCode, result.stderr).toBe(0)
      expect(result.stderr).not.toContain("ES2015")
    }

    const build = await run("build", "index.tsx")
    expect(build.exitCode, build.stderr).toBe(0)
    const circuitJson = JSON.parse(
      await readFile(path.join(projectDir, "dist/index/circuit.json"), "utf8"),
    )
    expect(
      circuitJson.some(
        (element: { type: string }) => element.type === "pcb_board",
      ),
    ).toBe(true)
    expect(
      circuitJson.some(
        (element: { type: string; name?: string }) =>
          element.type === "source_component" && element.name === "R1",
      ),
    ).toBe(true)

    for (const args of [
      ["transpile", "index.tsx"],
      ["build", "index.tsx", "--transpile"],
    ]) {
      expectIncompatibleCompiler(await run(...args))
    }

    await writeFile(
      path.join(projectDir, "tscircuit.config.json"),
      JSON.stringify({ build: { typescriptLibrary: true } }),
    )
    expectIncompatibleCompiler(await run("build", "index.tsx"))
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
}, 60_000)
