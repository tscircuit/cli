import "bun-match-svg"
import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const multiSheetCircuitCode = `
export default () => (
  <board width="20mm" height="10mm">
    <schematicsheet
      name="power"
      displayName="Power Sheet"
      sheetIndex={0}
    />
    <schematicsheet
      name="control"
      displayName="Control Sheet"
      sheetIndex={1}
    />
    <resistor
      name="R1"
      resistance="1k"
      footprint="0402"
      schSheetName="power"
    />
    <capacitor
      name="C1"
      capacitance="1uF"
      footprint="0402"
      schSheetName="control"
    />
  </board>
)`

test("repro: schematic-svg export renders only the default sheet", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "multiple-sheets.circuit.tsx")

  await writeFile(circuitPath, multiSheetCircuitCode)

  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} --format schematic-svg`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")

  const schematicSvg = await readFile(
    path.join(tmpDir, "multiple-sheets.circuit-schematic.svg"),
    "utf-8",
  )

  expect(schematicSvg).not.toContain('class="tscircuit-stacked-schematic"')
  expect(schematicSvg).toContain("R1")
  expect(schematicSvg).not.toContain("C1")
  await expect(schematicSvg).toMatchSvgSnapshot(
    import.meta.path,
    "only-default-sheet",
  )
})
