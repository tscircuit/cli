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

const multiDrcErrorCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={8} />
    <resistor resistance="2k" footprint="0402" name="R2" schX={4} pcbX={8} />
  </board>
)`

test("build succeeds when circuit JSON is generated with DRC errors", async () => {
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

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Build completed with errors")
}, 30_000)

test("build --ignore-drc suppresses DRC errors and reports ignored counts", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "test.circuit.tsx"),
    multiDrcErrorCircuitCode,
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout, stderr } = await runCommand(
    "tsci build --ignore-drc",
  )

  expect(exitCode).toBe(0)
  expect(stdout).toMatch(/> Ignored \d+ DRC check errors and \d+ warnings/)
  expect(stdout).toContain("✓ Done")
  expect(stderr).not.toContain("Component R1 extends outside board boundaries")
}, 30_000)
