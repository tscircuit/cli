import fs from "node:fs/promises"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { KicadFootprintToCircuitJsonConverter } from "kicad-to-circuit-json"

export const convertKicadFootprintContentToCircuitJson = (
  fileName: string,
  modContent: string,
) => {
  const converter = new KicadFootprintToCircuitJsonConverter()
  converter.addFile(fileName, modContent)
  converter.runUntilFinished()
  return converter.getOutput() as AnyCircuitElement[]
}

export const convertKicadFootprintToCircuitJson = async (inputPath: string) => {
  const modContent = await fs.readFile(inputPath, "utf-8")
  return convertKicadFootprintContentToCircuitJson(
    path.basename(inputPath),
    modContent,
  )
}
