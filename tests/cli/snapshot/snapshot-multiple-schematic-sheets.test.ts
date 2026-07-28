import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("snapshot stacks multiple schematic sheets into one SVG", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "multiple-sheets.circuit.tsx"),
    `
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
      )
    `,
  )

  const { exitCode } = await runCommand(
    "tsci snapshot --update --schematic-only",
  )
  expect(exitCode).toBe(0)

  const schematicSvg = await Bun.file(
    join(tmpDir, "__snapshots__", "multiple-sheets.circuit-schematic.snap.svg"),
  ).text()

  expect(schematicSvg).toContain('class="tscircuit-stacked-schematic"')
  expect(schematicSvg.match(/class="stacked-sheet-label"/g)).toHaveLength(2)
  expect(schematicSvg).toContain("Power Sheet")
  expect(schematicSvg).toContain("Control Sheet")
})
