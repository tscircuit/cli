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

test("export readable-netlist", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stderr } = await runCommand(
    `tsci export ${circuitPath} -f readable-netlist`,
  )
  // TODO: Remove this when the autorouter is not emitting this warning
  expect(stderr).toBe("")

  const readableNetlist = await readFile(
    path.join(tmpDir, "test-circuit-readable.netlist"),
    "utf-8",
  )
  expect(readableNetlist).toContain("COMPONENTS:")
  expect(readableNetlist).toContain("0402 resistor")
  expect(readableNetlist).toContain("C1: 1nF 0402 capacitor")
})
