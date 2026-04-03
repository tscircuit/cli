import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const validCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={8} />
  </board>
)`

// No --ignore-* flags used: DRC errors cause exit code 1 by default.
test("build fails when circuit JSON is generated with DRC errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "test.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand("tsci build")

  const circuitJsonPath = path.join(tmpDir, "dist", "test", "circuit.json")
  const circuitJson = await readFile(circuitJsonPath, "utf-8")
  const circuitJsonObject = JSON.parse(circuitJson)
  const error = circuitJsonObject.find(
    (c: any) => c.type === "pcb_component_outside_board_error",
  )
  expect(error.message).toContain(
    "Component R1 extends outside board boundaries",
  )

  expect(exitCode).toBe(1)
  expect(stdout).toContain("Build completed with errors")
  expect(stdout).toContain("0 passed 1 with errors")
}, 30_000)

// Proves --ignore-errors lets the build pass even with DRC errors.
test("build succeeds with --ignore-errors despite DRC errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "test.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand("tsci build --ignore-errors")

  expect(exitCode).toBe(0)
  expect(stdout).toContain("1 passed")
  expect(stdout).not.toContain("with errors")
}, 30_000)
