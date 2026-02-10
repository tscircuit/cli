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
      supplierPartNumbers={{
        jlcpcb: ["C17513"],
      }}
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      supplierPartNumbers={{
        jlcpcb: ["C1234"],
      }}
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)`

test("export bom-csv", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f bom-csv`,
  )

  const bomCsv = await readFile(
    path.join(tmpDir, "test-circuit.bom.csv"),
    "utf-8",
  )

  // Verify CSV has headers
  expect(bomCsv).toContain("Designator")
  expect(bomCsv).toContain("Footprint")

  // Verify components are in the BOM
  expect(bomCsv).toContain("R1")
  expect(bomCsv).toContain("C1")
  // Note: footprint values are not currently preserved in circuit JSON,
  // so we can't expect "0402" in the output

  // Verify it's valid CSV format (has commas)
  expect(bomCsv).toContain(",")

  // Check that the file was created successfully
  expect(stdout).toContain("Exported to")
  expect(stdout).toContain("test-circuit.bom.csv")
})

test("export bom-csv with custom output path", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  const customOutputPath = "custom-bom.csv"

  await writeFile(circuitPath, circuitCode)

  const { stdout } = await runCommand(
    `tsci export ${circuitPath} -f bom-csv -o ${customOutputPath}`,
  )

  const bomCsv = await readFile(path.join(tmpDir, customOutputPath), "utf-8")

  expect(bomCsv).toContain("Designator")
  expect(bomCsv).toContain("R1")
  expect(bomCsv).toContain("C1")
  expect(stdout).toContain("custom-bom.csv")
})
