import { expect, test } from "bun:test"
import { stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = (name: string) => `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="${name}" schX={3} pcbX={3} />
  </board>
)`

const configWithFunctionValuedPlatformConfig = `
import type { SpiceEngine } from "@tscircuit/props"

const createEngine = (): SpiceEngine => ({
  async simulate() {
    return {
      type: "transient_simulation_results",
      time: [],
      voltage: {},
      current: {},
    } as any
  },
})

export default {
  mainEntrypoint: "first.circuit.tsx",
  platformConfig: {
    spiceEngineMap: {
      ngspice: createEngine(),
    },
  },
}
`

const runBuildWithShortWorkerTimeout = async (
  tmpDir: string,
  { ci = false }: { ci?: boolean } = {},
) => {
  const buildArgs = ["build", "--concurrency", "2"]
  if (ci) {
    buildArgs.splice(1, 0, "--ci")
  }

  const task = Bun.spawn(
    ["bun", path.resolve(process.cwd(), "cli/main.ts"), ...buildArgs],
    {
      cwd: tmpDir,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NODE_ENV: "test",
        TSCI_TEST_MODE: "true",
        TSCIRCUIT_BUILD_WORKER_TIMEOUT_MS: "10000",
      },
    },
  )

  const stdoutPromise = new Response(task.stdout).text()
  const stderrPromise = new Response(task.stderr).text()
  const [stdout, stderr, exitCode] = await Promise.all([
    stdoutPromise,
    stderrPromise,
    task.exited,
  ])

  return { stdout, stderr, exitCode }
}

const setupProjectWithFunctionValuedPlatformConfig = async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "first.circuit.tsx"), circuitCode("R1"))
  await writeFile(path.join(tmpDir, "second.circuit.tsx"), circuitCode("R2"))
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify(
      { dependencies: { react: "^19.2.0", tscircuit: "*" } },
      null,
      2,
    ),
  )
  await writeFile(
    path.join(tmpDir, "tscircuit.config.ts"),
    configWithFunctionValuedPlatformConfig,
  )

  await runCommand("tsci install")

  return { tmpDir }
}

test("build --ci --concurrency supports platformConfig with SPICE engine functions", async () => {
  const { tmpDir } = await setupProjectWithFunctionValuedPlatformConfig()

  const { stdout, stderr, exitCode } = await runBuildWithShortWorkerTimeout(
    tmpDir,
    { ci: true },
  )

  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  expect(stdout).toContain("Building 2 file(s) with concurrency 2")
  expect(
    await stat(path.join(tmpDir, "dist", "first", "circuit.json")).then(
      (stats) => stats.isFile(),
    ),
  ).toBe(true)
  expect(
    await stat(path.join(tmpDir, "dist", "second", "circuit.json")).then(
      (stats) => stats.isFile(),
    ),
  ).toBe(true)
}, 30_000)

test("build --concurrency supports platformConfig with SPICE engine functions", async () => {
  const { tmpDir } = await setupProjectWithFunctionValuedPlatformConfig()

  const { stdout, stderr, exitCode } =
    await runBuildWithShortWorkerTimeout(tmpDir)

  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  expect(stdout).toContain("Building 2 file(s) with concurrency 2")
  expect(
    await stat(path.join(tmpDir, "dist", "first", "circuit.json")).then(
      (stats) => stats.isFile(),
    ),
  ).toBe(true)
  expect(
    await stat(path.join(tmpDir, "dist", "second", "circuit.json")).then(
      (stats) => stats.isFile(),
    ),
  ).toBe(true)
}, 30_000)
