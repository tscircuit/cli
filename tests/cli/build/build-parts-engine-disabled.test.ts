import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" schX={-3} pcbX={-3} />
  </board>
)`

test("build with partsEngineDisabled in config produces source_component without supplier_part_numbers", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ partsEngineDisabled: true }),
  )

  await runCommand(`tsci build ${circuitPath}`)

  const data = await readFile(
    path.join(tmpDir, "dist", "test-circuit", "circuit.json"),
    "utf-8",
  )
  const circuitJson = JSON.parse(data)
  const sourceComponents = circuitJson.filter(
    (component: any) => component.type === "source_component",
  )

  expect(sourceComponents.length).toBe(2)
  expect(sourceComponents[0].name).toBe("R1")
  expect(sourceComponents[1].name).toBe("C1")

  // When parts engine is disabled, supplier_part_numbers should be undefined
  expect(sourceComponents[0].supplier_part_numbers).toBeUndefined()
  expect(sourceComponents[1].supplier_part_numbers).toBeUndefined()
}, 30_000)
