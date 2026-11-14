import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const MODEL_URL_KEYS = [
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

const isWindowsDrivePath = (value: string) => /^[a-zA-Z]:[\\/]/.test(value)

const hasUriScheme = (value: string) =>
  !isWindowsDrivePath(value) && /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)

const resolveRelativeModelPath = (value: string, baseDir: string): string => {
  const candidateInBaseDir = path.resolve(baseDir, value)
  if (fs.existsSync(candidateInBaseDir)) {
    return candidateInBaseDir
  }

  const cwd = process.cwd()
  if (path.resolve(baseDir) !== path.resolve(cwd)) {
    const candidateInCwd = path.resolve(cwd, value)
    if (fs.existsSync(candidateInCwd)) {
      return candidateInCwd
    }
  }

  return candidateInBaseDir
}

/**
 * Convert local file paths in model URLs to file:// URLs for fetch() compatibility.
 * The circuit-json-to-gltf library uses fetch() to load GLB/STL/OBJ/GLTF/STEP files,
 * which requires proper URLs rather than local file paths.
 */
export const convertModelUrlsToFileUrls = (
  circuitJson: any[],
  baseDir = process.cwd(),
): any[] => {
  return circuitJson.map((element) => {
    if (!element || typeof element !== "object") return element

    const updated = { ...element }
    for (const key of MODEL_URL_KEYS) {
      const value = updated[key]
      if (typeof value === "string" && value.length > 0) {
        // Skip values that are already URIs (http://, https://, file://, data:, blob:, etc.)
        if (hasUriScheme(value)) continue

        if (value.startsWith("/") || isWindowsDrivePath(value)) {
          // Absolute path (Unix or Windows)
          updated[key] = pathToFileURL(value).href
        } else {
          // Relative path (e.g. ./libraries/cap.step or libraries/cap.step)
          updated[key] = pathToFileURL(
            resolveRelativeModelPath(value, baseDir),
          ).href
        }
      }
    }
    return updated
  })
}
