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

type CircuitElementWithModelUrls = AnyCircuitElement &
  Partial<Record<(typeof modelUrlKeys)[number], string>>

/**
 * Convert local file paths in model URLs to file:// URLs for fetch() compatibility.
 * The circuit-json-to-gltf library uses fetch() to load GLB/STL/OBJ/GLTF/STEP files,
 * which requires proper URLs rather than local file paths.
 */
export const convertModelUrlsToFileUrls = (
  circuitJson: AnyCircuitElement[],
  baseDirectory = process.cwd(),
): AnyCircuitElement[] => {
  return circuitJson.map((element) => {
    if (!element || typeof element !== "object") return element

    const updated: CircuitElementWithModelUrls = { ...element }
    for (const key of modelUrlKeys) {
      const modelUrl = updated[key]
      if (typeof modelUrl === "string" && modelUrl.length > 0) {
        // Skip values that already carry a URI scheme (http://, https://, file://, data:, etc.),
        // while excluding single-letter Windows drive paths such as C:\model.step.
        if (
          /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(modelUrl) &&
          !/^[a-zA-Z]:[\\/]/.test(modelUrl)
        ) {
          continue
        }

        if (modelUrl.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(modelUrl)) {
          updated[key] = pathToFileURL(modelUrl).href
        } else {
          updated[key] = pathToFileURL(
            path.resolve(baseDirectory, modelUrl),
          ).href
        }
      }
    }
    return updated
  })
}
