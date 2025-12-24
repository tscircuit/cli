import { pathToFileURL } from "node:url"

/**
 * Convert local file paths in model URLs to file:// URLs for fetch() compatibility.
 * The circuit-json-to-gltf library uses fetch() to load GLB/STL/OBJ/GLTF files,
 * which requires proper URLs rather than local file paths.
 */
export const convertModelUrlsToFileUrls = (circuitJson: any[]): any[] => {
  const modelUrlKeys = [
    "model_glb_url",
    "glb_model_url",
    "model_stl_url",
    "stl_model_url",
    "model_obj_url",
    "obj_model_url",
    "model_gltf_url",
    "gltf_model_url",
  ]

  return circuitJson.map((element) => {
    if (!element || typeof element !== "object") return element

    const updated = { ...element }
    for (const key of modelUrlKeys) {
      const value = updated[key]
      if (typeof value === "string" && value.length > 0) {
        // Check if it's a local file path (starts with / or drive letter on Windows)
        // and not already a URL (http://, https://, file://, etc.)
        if (
          !value.match(/^[a-zA-Z]+:\/\//) &&
          (value.startsWith("/") || value.match(/^[a-zA-Z]:\\/))
        ) {
          updated[key] = pathToFileURL(value).href
        }
      }
    }
    return updated
  })
}
