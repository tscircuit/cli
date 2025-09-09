import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { join } from "node:path"
import { stat } from "node:fs/promises"

test("build can use npm dependencies", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Setup a tscircuit project
  await runCommand("tsci init -y")

  // Install an npm dependency
  const proc = Bun.spawnSync(["bun", "add", "is-odd"], {
    cwd: tmpDir,
  })
  expect(proc.exitCode).toBe(0)

  // Overwrite index.tsx to use the dependency
  const circuitPath = join(tmpDir, "index.tsx")
  const circuitContent = `
import isOdd from 'is-odd'

export default () => {
    if (!isOdd(3)) {
        throw new Error("isOdd(3) should be true")
    }
    return (
        <board width="10mm" height="10mm">
            <resistor name="R1" resistance="1k" footprint="0402" />
        </board>
    )
}
`
  await Bun.write(circuitPath, circuitContent)

  // Build the project
  const { stdout, stderr } = await runCommand("tsci build index.tsx")
  expect(stderr).toBe("")
  expect(stdout).toContain("Circuit JSON written to")

  // Check that the output file exists
  const circuitJsonPath = join(tmpDir, "dist/index/circuit.json")
  expect(await stat(circuitJsonPath)).toBeDefined()
}, 30_000)

test("build command should fail if circuit code with npm dependency throws error", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Setup a tscircuit project
  await runCommand("tsci init -y")

  // Install an npm dependency
  const proc = Bun.spawnSync(["bun", "add", "is-odd"], {
    cwd: tmpDir,
  })
  expect(proc.exitCode).toBe(0)

  // Overwrite index.tsx to use the dependency and throw an error
  const circuitPath = join(tmpDir, "index.tsx")
  const circuitContent = `
import isOdd from 'is-odd'

export default () => {
    if (isOdd(3)) {
        throw new Error("isOdd(3) is true, throwing for test")
    }
    return (
        <board width="10mm" height="10mm">
            <resistor name="R1" resistance="1k" footprint="0402" />
        </board>
    )
}
`
  await Bun.write(circuitPath, circuitContent)

  // `tsci build` logs to stderr and exits with 1. runCommand in the test
  // fixture doesn't check the exit code, but we can assert stderr.
  const { stdout, stderr } = await runCommand("tsci build index.tsx")
  expect(stdout).not.toContain("Circuit JSON written to")
  expect(stderr).toContain("isOdd(3) is true, throwing for test")
}, 30_000)
