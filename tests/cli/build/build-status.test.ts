import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitWithDrcError = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={8} />
  </board>
)
`

test("build --status summarizes issues without generating artifacts", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "test.circuit.tsx"), circuitWithDrcError)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand("tsci build --status")

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Build status")
  expect(stdout).toContain("Errors    1")
  expect(stdout).toContain("Warnings  3")
  expect(stdout).toContain("Schematic issues 0")
  expect(stdout).toContain("Source issues    2")
  expect(stdout).toContain("Netlist issues   0")
  expect(stdout).toContain("Placement issues 1")
  expect(stdout).toContain("Unknown issues   1")
  expect(stdout).toContain("Issues")
  expect(stdout).toContain("test.circuit.tsx")
  expect(stdout).toContain("error [placement]")
  expect(stdout).toContain("warning [source]")
  expect(stdout).toContain("warning [unknown]")
  expect(stdout).toContain("Component R1 extends outside board boundaries")
  expect(existsSync(path.join(tmpDir, "dist"))).toBe(false)
}, 30_000)
