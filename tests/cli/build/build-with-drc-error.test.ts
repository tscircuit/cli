import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// Component placed outside the board generates a pcb_component_outside_board_error.
const validCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={8} />
  </board>
)`

test("build exits with code 1 when circuit has DRC errors (without --ignore-errors)", async () => {
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

  // Build should exit non-zero when there are errors and --ignore-errors is not set
  expect(exitCode).toBe(1)
  expect(stdout).toContain("Build completed with errors")
}, 30_000)

test("build exits with code 0 when circuit has DRC errors and --ignore-errors is set", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "test.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand("tsci build --ignore-errors")

  // Circuit JSON is still written even when there are errors
  const circuitJsonPath = path.join(tmpDir, "dist", "test", "circuit.json")
  const circuitJson = await readFile(circuitJsonPath, "utf-8")
  const circuitJsonObject = JSON.parse(circuitJson)
  const error = circuitJsonObject.find(
    (c: any) => c.type === "pcb_component_outside_board_error",
  )
  expect(error.message).toContain(
    "Component R1 extends outside board boundaries",
  )

  // With --ignore-errors, build should still exit 0 and show success
  expect(exitCode).toBe(0)
  expect(stdout).toContain("Done")
}, 30_000)
