import { isFootprinterString } from "lib/shared/is-footprinter-string"
import type { AnyCircuitElement } from "circuit-json"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import fs from "node:fs/promises"
import path from "node:path"
import { convertKicadFootprintToCircuitJson } from "./convert-kicad-footprint-to-circuit-json"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"

const componentExtensions = new Set([".js", ".jsx", ".ts", ".tsx"])

export const loadFootprintFile = async (
  inputPath: string,
): Promise<{
  circuitJson: AnyCircuitElement[]
  declaredFootprinterString?: string
}> => {
  const extension = path.extname(inputPath).toLowerCase()
  if (inputPath.toLowerCase().endsWith(".circuit.json")) {
    const parsed = JSON.parse(await fs.readFile(inputPath, "utf-8"))
    if (!Array.isArray(parsed)) {
      throw new Error("Circuit JSON input must contain an array of elements")
    }
    return { circuitJson: parsed as AnyCircuitElement[] }
  }

  if (extension === ".kicad_mod") {
    return { circuitJson: await convertKicadFootprintToCircuitJson(inputPath) }
  }

  if (componentExtensions.has(extension)) {
    const { circuitJson, rootCircuit } = await generateCircuitJson({
      filePath: inputPath,
      injectedProps: { name: "CONVERT" },
      platformConfig: getPlatformConfigWithCliDefaults(undefined, {
        projectDir: findCircuitProjectDir(inputPath),
      }),
    })
    const pcbComponents = circuitJson.filter(
      (element) => element.type === "pcb_component",
    )
    if (pcbComponents.length > 1) {
      throw new Error(
        "TSX input must render one component or footprint, not an entire board",
      )
    }
    const pcb = pcbComponents[0]
    const component =
      pcb &&
      rootCircuit
        .selectAll("*")
        .find(
          (element: { pcb_component_id?: string }) =>
            element.pcb_component_id === pcb.pcb_component_id,
        )
    const footprint =
      component?.resolveFootprint?.() ?? component?.props?.footprint
    const declaredFootprinterString =
      typeof footprint === "string" && isFootprinterString(footprint)
        ? footprint
        : undefined
    return { circuitJson, declaredFootprinterString }
  }

  throw new Error(
    "Footprinter conversion supports .tsx, .ts, .jsx, .js, .circuit.json, and .kicad_mod inputs",
  )
}
