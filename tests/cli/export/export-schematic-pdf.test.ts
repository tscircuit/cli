import { expect, test } from "bun:test"
import { PDFDocument } from "pdf-lib"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test(
  "export schematic-pdf puts each schematic sheet on its own page",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "multiple-sheets.circuit.tsx")

    await Bun.write(
      circuitPath,
      `
      export default () => (
        <board width="20mm" height="10mm">
          <schematicsheet
            name="power"
            displayName="Power"
            sheetIndex={1}
          />
          <schematicsheet
            name="control"
            displayName="Control"
            sheetIndex={0}
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

    const { exitCode, stderr } = await runCommand(
      `tsci export ${circuitPath} -f schematic-pdf`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")

    const outputPath = path.join(
      tmpDir,
      "multiple-sheets.circuit-schematic.pdf",
    )
    const pdfBytes = await Bun.file(outputPath).arrayBuffer()
    const pdf = await PDFDocument.load(pdfBytes)

    expect(pdf.getPageCount()).toBe(2)
    expect(new Uint8Array(pdfBytes).slice(0, 5)).toEqual(
      new TextEncoder().encode("%PDF-"),
    )
  },
  { timeout: 15_000 },
)

test(
  "export schematic-pdf creates one page without explicit sheets",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "single-sheet.circuit.tsx")

    await Bun.write(
      circuitPath,
      `
      export default () => (
        <board width="10mm" height="10mm">
          <resistor name="R1" resistance="1k" footprint="0402" />
        </board>
      )
    `,
    )

    const { exitCode, stderr } = await runCommand(
      `tsci export ${circuitPath} -f schematic-pdf`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")

    const outputPath = path.join(tmpDir, "single-sheet.circuit-schematic.pdf")
    const pdf = await PDFDocument.load(await Bun.file(outputPath).arrayBuffer())

    expect(pdf.getPageCount()).toBe(1)
  },
  { timeout: 15_000 },
)
