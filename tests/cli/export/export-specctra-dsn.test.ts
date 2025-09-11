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

test("export specctra-dsn", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f specctra-dsn`,
  )
  // TODO: Remove this when the autorouter is not emitting this warning
  expect(stderr).toBe("")

  const specctraDSN = await readFile(
    path.join(tmpDir, "test-circuit.dsn"),
    "utf-8",
  )
  expect(specctraDSN).toContain("(layer F.Cu")
  expect(specctraDSN).toContain("(layer B.Cu")
  expect(specctraDSN).toContain('(component "simple_resistor')
  expect(specctraDSN).toContain('(net "Net-(R1_source_component_0-Pad1)"')
})
