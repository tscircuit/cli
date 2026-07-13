import type { AnyCircuitElement } from "circuit-json"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import fs from "node:fs/promises"
import path from "node:path"
import { convertKicadFootprintToCircuitJson } from "./convert-kicad-footprint-to-circuit-json"

const componentExtensions = new Set([".js", ".jsx", ".ts", ".tsx"])

export const loadCircuitJsonForFootprinter = async (inputPath: string) => {
  const extension = path.extname(inputPath).toLowerCase()
  if (inputPath.toLowerCase().endsWith(".circuit.json")) {
    const parsed = JSON.parse(await fs.readFile(inputPath, "utf-8"))
    if (!Array.isArray(parsed)) {
      throw new Error("Circuit JSON input must contain an array of elements")
    }
    return parsed as AnyCircuitElement[]
  }

  if (extension === ".kicad_mod") {
    return convertKicadFootprintToCircuitJson(inputPath)
  }

  if (componentExtensions.has(extension)) {
    const { circuitJson } = await generateCircuitJson({
      filePath: inputPath,
      injectedProps: { name: "CONVERT" },
      platformConfig: getPlatformConfigWithCliDefaults(),
    })
    const pcbComponentCount = circuitJson.filter(
      (element) => element.type === "pcb_component",
    ).length
    if (pcbComponentCount > 1) {
      throw new Error(
        "TSX input must render one component or footprint, not an entire board",
      )
    }
    return circuitJson
  }

  throw new Error(
    "Footprinter conversion supports .tsx, .ts, .jsx, .js, .circuit.json, and .kicad_mod inputs",
  )
}
