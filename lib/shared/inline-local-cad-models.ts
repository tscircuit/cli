import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { AnyCircuitElement } from "circuit-json"

// These formats are self-contained. Do not inline JSON GLTF here: its buffers
// and textures may be relative to the original model URL.
const modelKeys = [
  "model_obj_url",
  "model_stl_url",
  "model_glb_url",
  "model_step_url",
] as const

/** Make downloaded CAD assets fetchable in both Bun and Node, without sending
 * project-relative paths to the registry or changing the saved Circuit JSON. */
export async function inlineLocalCadModels(
  circuitJson: AnyCircuitElement[],
  projectDir = process.cwd(),
): Promise<AnyCircuitElement[]> {
  const cache = new Map<string, string>()
  return Promise.all(
    circuitJson.map(async (element) => {
      if (element.type !== "cad_component") return element
      const updated = { ...element }
      for (const key of modelKeys) {
        const url = updated[key]
        if (!url) continue
        const isFileUrl = url.startsWith("file:")
        if (
          !isFileUrl &&
          /^[a-z][a-z\d+.-]*:/i.test(url) &&
          !path.isAbsolute(url)
        )
          continue
        const localPath = isFileUrl
          ? fileURLToPath(url)
          : path.resolve(projectDir, url)
        let dataUrl = cache.get(localPath)
        if (!dataUrl) {
          let content: Buffer
          try {
            content = await readFile(localPath)
          } catch (error) {
            // Registry packages can refer to assets that are not installed locally.
            if (
              (error as NodeJS.ErrnoException).code === "ENOENT" &&
              /^(\.\/)?node_modules\//.test(url)
            )
              continue
            throw new Error(`Could not read local CAD model ${url}: ${error}`, {
              cause: error,
            })
          }
          dataUrl = `data:application/octet-stream;base64,${content.toString("base64")}`
          cache.set(localPath, dataUrl)
        }
        updated[key] = dataUrl
      }
      return updated
    }),
  )
}
