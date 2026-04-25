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

test("export pnp-csv", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitPath, circuitCode)

  const { stdout, stderr } = await runCommand(
    `tsci export ${circuitPath} -f pnp-csv`,
  )

  const pnpCsv = await readFile(
    path.join(tmpDir, "test-circuit-pnp.csv"),
    "utf-8",
  )
  expect(pnpCsv).toContain("Designator")
  expect(pnpCsv).toContain("Mid X")
  expect(pnpCsv).toContain("Mid Y")
  expect(pnpCsv).toContain("Layer")
  expect(pnpCsv).toContain("Rotation")
  expect(pnpCsv).toContain("R1")
  expect(pnpCsv).toContain("C1")
}, 30_000)
