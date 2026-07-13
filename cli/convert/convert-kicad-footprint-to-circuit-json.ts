import type { AnyCircuitElement } from "circuit-json"
import fs from "node:fs/promises"
import path from "node:path"
import { KicadFootprintToCircuitJsonConverter } from "kicad-to-circuit-json"

export const convertKicadFootprintToCircuitJson = async (inputPath: string) => {
  const modContent = await fs.readFile(inputPath, "utf-8")
  const converter = new KicadFootprintToCircuitJsonConverter()
  converter.addFile(path.basename(inputPath), modContent)
  converter.runUntilFinished()
  return converter.getOutput() as AnyCircuitElement[]
}
