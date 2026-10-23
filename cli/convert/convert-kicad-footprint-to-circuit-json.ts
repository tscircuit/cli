import type { AnyCircuitElement } from "circuit-json"
import fs from "node:fs/promises"
import path from "node:path"
import {
  KicadFootprintToCircuitJsonConverter,
  upgradeKicad5FootprintToKicad6,
} from "kicad-to-circuit-json"
import { parseKicadMod } from "kicadts"

const normalizeKicadFootprintReferencePlaceholders = (modContent: string) => {
  const footprint = parseKicadMod(upgradeKicad5FootprintToKicad6(modContent))
  const properties = Array.isArray(footprint.properties)
    ? footprint.properties
    : footprint.properties
      ? [footprint.properties]
      : []

  for (const property of properties) {
    if (property?.key === "Reference") {
      property.value = "{REF}"
    }
  }

  const fpTexts = Array.isArray(footprint.fpTexts)
    ? footprint.fpTexts
    : footprint.fpTexts
      ? [footprint.fpTexts]
      : []

  for (const fpText of fpTexts) {
    if (fpText?.type === "reference") {
      fpText.text = "{REF}"
    }
  }

  return footprint.getString()
}

export const convertKicadFootprintToCircuitJson = async (inputPath: string) => {
  const modContent = await fs.readFile(inputPath, "utf-8")
  const originalConverter = new KicadFootprintToCircuitJsonConverter()
  originalConverter.addFile(path.basename(inputPath), modContent)
  originalConverter.runUntilFinished()
  const originalSourceComponent = (
    originalConverter.getOutput() as AnyCircuitElement[]
  ).find((element) => element.type === "source_component")

  const normalizedModContent =
    normalizeKicadFootprintReferencePlaceholders(modContent)
  const converter = new KicadFootprintToCircuitJsonConverter()
  converter.addFile(path.basename(inputPath), normalizedModContent)
  converter.runUntilFinished()

  return (converter.getOutput() as AnyCircuitElement[]).map((element) =>
    element.type === "source_component" && originalSourceComponent
      ? originalSourceComponent
      : element,
  )
}
