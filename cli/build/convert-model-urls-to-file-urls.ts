import { existsSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

/**
 * Resolve local model paths before the converter applies its registry base URL.
 * Keep assets as file references so loaders can read them on demand.
 */
export const convertModelUrlsToFileUrls = (
  circuitJson: any[],
  projectDir = process.cwd(),
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
  ]

  return circuitJson.map((element) => {
    if (!element || typeof element !== "object") return element

    const updated = { ...element }
    for (const key of modelUrlKeys) {
      const value = updated[key]
      if (typeof value === "string" && value.length > 0) {
        // Skip values that are already URLs (http://, https://, file://, etc.)
        if (value.match(/^[a-zA-Z]+:\/\//)) continue

        const localPath = path.resolve(projectDir, value)
        // Uninstalled package assets still need the registry URL resolver.
        if (/^(\.\/)?node_modules\//.test(value) && !existsSync(localPath))
          continue

        if (value.startsWith("/") || value.match(/^[a-zA-Z]:\\/)) {
          // Absolute path (Unix or Windows)
          updated[key] = pathToFileURL(value).href
        } else if (value.startsWith(".") || existsSync(localPath)) {
          // Relative path (e.g. ./chip.glb) — resolve against cwd
          updated[key] = pathToFileURL(localPath).href
        }
      }
    }
    return updated
  })
}
