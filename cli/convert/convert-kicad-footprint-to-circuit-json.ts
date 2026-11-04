import type { AnyCircuitElement } from "circuit-json"
import fs from "node:fs/promises"
import path from "node:path"
import { KicadFootprintToCircuitJsonConverter } from "kicad-to-circuit-json"

const KICAD_REFERENCE_SENTINEL = "__TSCIRCUIT_KICAD_REF__"

export const convertKicadFootprintToCircuitJson = async (inputPath: string) => {
  const modContent = await fs.readFile(inputPath, "utf-8")
  let originalReference = "REF**"

  const taggedModContent = modContent
    .replace(
      /(\(\s*fp_text\s+reference\s+)"((?:\\.|[^"\\])*)"/g,
      (_match, prefix: string, refText: string) => {
        if (refText) originalReference = refText
        return `${prefix}"${KICAD_REFERENCE_SENTINEL}"`
      },
    )
    .replace(
      /(\(\s*property\s+"Reference"\s+)"((?:\\.|[^"\\])*)"/g,
      (_match, prefix: string, refText: string) => {
        if (refText) originalReference = refText
        return `${prefix}"${KICAD_REFERENCE_SENTINEL}"`
      },
    )

  const converter = new KicadFootprintToCircuitJsonConverter()
  converter.addFile(path.basename(inputPath), taggedModContent)
  converter.runUntilFinished()
  const circuitJson = converter.getOutput() as AnyCircuitElement[]

  for (const element of circuitJson) {
    if (
      element.type === "pcb_silkscreen_text" &&
      typeof element.text === "string" &&
      element.text.includes(KICAD_REFERENCE_SENTINEL)
    ) {
      element.text = element.text.replaceAll(KICAD_REFERENCE_SENTINEL, "{REF}")
      continue
    }

    if (
      "text" in element &&
      typeof element.text === "string" &&
      element.text.includes(KICAD_REFERENCE_SENTINEL)
    ) {
      element.text = element.text.replaceAll(
        KICAD_REFERENCE_SENTINEL,
        originalReference,
      )
    }

    if (
      "name" in element &&
      typeof element.name === "string" &&
      element.name.includes(KICAD_REFERENCE_SENTINEL)
    ) {
      element.name = element.name.replaceAll(
        KICAD_REFERENCE_SENTINEL,
        originalReference,
      )
    }
  }

  return circuitJson
}
