import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"

/**
 * All model URL keys that may contain local file paths
 */
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
]

/**
 * Check if a value is a local file path (not a URL)
 */
const isLocalFilePath = (value: string): boolean => {
  // Already a URL (http://, https://, file://, data:, etc.)
  if (value.match(/^[a-zA-Z]+:\/\//) || value.startsWith("data:")) {
    return false
  }
  // Relative path (already processed or relative asset)
  if (value.startsWith("./") || value.startsWith("../")) {
    return false
  }
  // Local file path (starts with / on Unix or drive letter on Windows)
  return value.startsWith("/") || value.match(/^[a-zA-Z]:\\/) !== null
}

/**
 * Find existing asset in dist/assets that matches the source file
 * (possibly copied by transpile with a hash)
 */
const findExistingAsset = (
  sourcePath: string,
  assetsDir: string,
): string | null => {
  if (!fs.existsSync(assetsDir)) return null

  const basename = path.basename(sourcePath)
  const ext = path.extname(basename)
  const nameWithoutExt = path.basename(basename, ext)

  const assetFiles = fs.readdirSync(assetsDir)

  // Look for exact match first
  if (assetFiles.includes(basename)) {
    return path.join(assetsDir, basename)
  }

  // Look for hashed version (name-hash.ext)
  const hashPattern = new RegExp(
    `^${escapeRegExp(nameWithoutExt)}-[a-f0-9]+${escapeRegExp(ext)}$`,
  )
  const hashedFile = assetFiles.find((f) => hashPattern.test(f))
  if (hashedFile) {
    return path.join(assetsDir, hashedFile)
  }

  return null
}

/**
 * Escape special regex characters
 */
const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Rewrite model URLs in circuit.json from absolute local paths to relative paths
 * for --use-cdn-javascript site builds.
 *
 * This function:
 * 1. Finds model URLs that are local file paths
 * 2. Checks if the asset already exists in dist/assets (from transpile)
 * 3. If not, copies the asset to dist/assets with a content hash
 * 4. Updates the URL to be relative from the dist root (where index.html lives)
 *
 * @param circuitJson The circuit.json array
 * @param distDir The root dist directory (where index.html lives)
 * @returns Updated circuit.json with relative asset URLs
 */
export const rewriteModelUrlsForSite = (
  circuitJson: any[],
  distDir: string,
): any[] => {
  const assetsDir = path.join(distDir, "assets")
  const processedAssets = new Map<string, string>() // originalPath -> relative URL

  return circuitJson.map((element) => {
    if (!element || typeof element !== "object") return element

    const updated = { ...element }
    for (const key of MODEL_URL_KEYS) {
      const value = updated[key]
      if (
        typeof value === "string" &&
        value.length > 0 &&
        isLocalFilePath(value)
      ) {
        // Check if we've already processed this asset
        if (processedAssets.has(value)) {
          updated[key] = processedAssets.get(value)!
          continue
        }

        // Check if the source file exists
        if (!fs.existsSync(value)) {
          console.warn(`Warning: Model asset not found: ${value}`)
          continue
        }

        // Check if asset already exists in dist/assets (from transpile)
        let destPath = findExistingAsset(value, assetsDir)

        if (!destPath) {
          // Asset not found, copy it with content hash
          fs.mkdirSync(assetsDir, { recursive: true })

          const fileBuffer = fs.readFileSync(value)
          const hash = createHash("sha1")
            .update(fileBuffer)
            .digest("hex")
            .slice(0, 8)
          const ext = path.extname(value)
          const nameWithoutExt = path.basename(value, ext)
          const destFilename = `${nameWithoutExt}-${hash}${ext}`
          destPath = path.join(assetsDir, destFilename)

          fs.writeFileSync(destPath, fileBuffer)
        }

        // URL relative to dist root (where index.html lives)
        const relativeUrl = `./${path.relative(distDir, destPath).split(path.sep).join("/")}`
        processedAssets.set(value, relativeUrl)
        updated[key] = relativeUrl
      }
    }
    return updated
  })
}
