import type { AnyCircuitElement, SchematicSheet } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { PDFDocument } from "pdf-lib"
import { convertSvgToPngBuffer } from "./convert-svg-to-png"

const A4_LANDSCAPE_WIDTH = 841.89
const A4_LANDSCAPE_HEIGHT = 595.28
const RENDER_SCALE = 2

const getSchematicSheets = (
  circuitJson: AnyCircuitElement[],
): SchematicSheet[] =>
  circuitJson
    .filter(
      (element): element is SchematicSheet =>
        element.type === "schematic_sheet",
    )
    .sort((a, b) => (a.sheet_index ?? 0) - (b.sheet_index ?? 0))

export const convertCircuitJsonToSchematicPdf = async (
  circuitJson: AnyCircuitElement[],
): Promise<Buffer> => {
  const pdf = await PDFDocument.create()
  const schematicSheets = getSchematicSheets(circuitJson)
  const pages = schematicSheets.length > 0 ? schematicSheets : [undefined]

  for (const schematicSheet of pages) {
    const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
      width: Math.round(A4_LANDSCAPE_WIDTH * RENDER_SCALE),
      height: Math.round(A4_LANDSCAPE_HEIGHT * RENDER_SCALE),
      schematicSheetId: schematicSheet?.schematic_sheet_id,
    })
    const schematicPng = convertSvgToPngBuffer(schematicSvg)
    const embeddedPng = await pdf.embedPng(schematicPng)
    const page = pdf.addPage([A4_LANDSCAPE_WIDTH, A4_LANDSCAPE_HEIGHT])

    page.drawImage(embeddedPng, {
      x: 0,
      y: 0,
      width: A4_LANDSCAPE_WIDTH,
      height: A4_LANDSCAPE_HEIGHT,
    })
  }

  return Buffer.from(await pdf.save())
}
