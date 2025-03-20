import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)`

test("export circuit-json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f circuit-json`,
  )
  expect(stderr).toBe("")

  const circuitJson = await readFile(
    path.join(tmpDir, "test-circuit.circuit.json"),
    "utf-8",
  )
  const source_component = JSON.parse(circuitJson).filter(
    (component: any) => component.type === "source_component",
  )

  expect(source_component.length).toBe(2)
  expect(source_component[0].name).toBe("R1")
  expect(source_component[1].name).toBe("C1")
})