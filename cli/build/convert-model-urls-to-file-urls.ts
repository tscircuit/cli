import path from "node:path"
import { pathToFileURL } from "node:url"

/**
 * Convert local file paths in model URLs to file:// URLs for fetch() compatibility.
 * The circuit-json-to-gltf library uses fetch() to load GLB/STL/OBJ/GLTF files,
 * which requires proper URLs rather than local file paths.
 */
export const convertModelUrlsToFileUrls = (
  circuitJson: any[],
  baseDir: string = process.cwd(),
): any[] => {
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
    "model_3mf_url",
    "model_wrl_url",
  ]

  return circuitJson.map((element) => {
    if (!element || typeof element !== "object") return element

    const updated = { ...element }
    for (const key of modelUrlKeys) {
      const value = updated[key]
      if (typeof value === "string" && value.length > 0) {
        // Skip values that are already URLs (http://, https://, file://, etc.)
        if (value.match(/^[a-zA-Z]+:\/\//)) continue

        if (path.isAbsolute(value)) {
          // Absolute path (Unix or Windows)
          updated[key] = pathToFileURL(value).href
        } else {
          // Relative path (e.g. ./chip.glb, libraries/cap.step)
          updated[key] = pathToFileURL(path.resolve(baseDir, value)).href
        }
      }
    }
    return updated
  })
}
