import type { CircuitJson } from "circuit-json"
import { circuitJsonToStep } from "circuit-json-to-step"

/** Keep the CLI's one-file-per-printed-part ZIP contract with the STEP assembly API. */
export async function convertCircuitJsonToAssemblyStepFiles(
  circuitJson: CircuitJson,
): Promise<Record<string, string>> {
  const printedParts = circuitJson.filter(
    (element) =>
      element.type === "source_component" && element.ftype === "printedpart",
  )
  if (printedParts.length === 0) {
    throw new Error("No assembly.printedpart elements found to export")
  }

  const files: Record<string, string> = {}
  const usedNames = new Set<string>()
  for (const part of printedParts) {
    const partGeometry = circuitJson.filter(
      (element) =>
        element.type === "cad_component" &&
        element.source_component_id === part.source_component_id &&
        element.model_jscad,
    )
    if (partGeometry.length === 0) {
      throw new Error(`Printed part "${part.name}" needs JSCAD geometry`)
    }

    const baseName =
      part.name.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") ||
      "printed-part"
    let fileName = `${baseName}.step`
    let suffix = 2
    while (usedNames.has(fileName.toLowerCase())) {
      fileName = `${baseName}-${suffix++}.step`
    }
    usedNames.add(fileName.toLowerCase())
    files[fileName] = await circuitJsonToStep([part, ...partGeometry], {
      exportMode: "assembly",
      productName: part.name,
    })
  }
  return files
}
