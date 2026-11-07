import path from "node:path"
import { pathToFileURL } from "node:url"
import type { AnyCircuitElement } from "circuit-json"

const modelUrlKeys = [
  "model_glb_url",
  "glb_model_url",
  "model_stl_url",
  "stl_model_url",
  "model_obj_url",
  "obj_model_url",
  "model_gltf_url",
  "gltf_model_url",
  "model_step_url",
  "step_model_url",
] as const

// Preserve the helper's legacy URL aliases alongside canonical Circuit JSON keys.
type CircuitElementWithModelUrls = AnyCircuitElement &
  Partial<Record<(typeof modelUrlKeys)[number], string>>

/**
 * Convert local file paths in model URLs to file:// URLs for fetch() compatibility.
 * The circuit-json-to-gltf library uses fetch() to load GLB/STL/OBJ/GLTF files,
 * which requires proper URLs rather than local file paths.
 */
export const convertModelUrlsToFileUrls = (
  circuitJson: AnyCircuitElement[],
  baseDirectory = process.cwd(),
): AnyCircuitElement[] => {
  return circuitJson.map((element) => {
    const updated: CircuitElementWithModelUrls = { ...element }
    for (const key of modelUrlKeys) {
      const modelUrl = updated[key]
      if (typeof modelUrl === "string" && modelUrl.length > 0) {
        // Skip model URLs that are already URLs (http://, https://, file://, etc.)
        if (modelUrl.match(/^[a-zA-Z]+:\/\//)) continue

        if (modelUrl.startsWith("/") || modelUrl.match(/^[a-zA-Z]:\\/)) {
          // Absolute path (Unix or Windows)
          updated[key] = pathToFileURL(modelUrl).href
        } else if (modelUrl.startsWith(".")) {
          // Relative path (e.g. ./chip.glb) — resolve against the input project.
          updated[key] = pathToFileURL(
            path.resolve(baseDirectory, modelUrl),
          ).href
        }
      }
    }
    return updated
  })
}
