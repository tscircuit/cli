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

test("default build and --ignore-errors both exit zero for DRC errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "test.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const defaultBuild = await runCommand("tsci build")
  const ignoredBuild = await runCommand("tsci build --ignore-errors")

  const circuitJsonPath = path.join(tmpDir, "dist", "test", "circuit.json")
  const circuitJson = await readFile(circuitJsonPath, "utf-8")
  const circuitJsonObject = JSON.parse(circuitJson)
  const error = circuitJsonObject.find(
    (c: any) => c.type === "pcb_component_outside_board_error",
  )
  expect(error.message).toContain(
    "Component R1 extends outside board boundaries",
  )

  expect(defaultBuild.exitCode).toBe(0)
  expect(defaultBuild.stdout).toContain("Build completed with errors")
  expect(ignoredBuild.exitCode).toBe(0)
}, 30_000)
