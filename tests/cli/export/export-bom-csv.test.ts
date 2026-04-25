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
  </board>
)`

test("export bom-csv", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { exitCode } = await runCommand(
    `tsci export ${circuitPath} -f bom-csv`,
  )
  expect(exitCode).toBe(0)

  const bomCsv = await readFile(
    path.join(tmpDir, "test-circuit.bom.csv"),
    "utf-8",
  )
  expect(bomCsv).toContain("R1")
  expect(bomCsv).toContain("C1")
})
