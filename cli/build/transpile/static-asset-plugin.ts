import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"

export const STATIC_ASSET_EXTENSIONS = new Set([
  ".glb",
  ".gltf",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
  ".gif",
  ".bmp",
  ".step",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
])

export const createStaticAssetPlugin = ({
  outputDir,
  projectDir,
  baseUrl,
  pathMappings,
}: {
  outputDir: string
  projectDir: string
  baseUrl?: string
  pathMappings?: Record<string, string[]>
}) => {
  const sourceToRelative = new Map<string, string>()
  const absoluteToRelative = new Map<string, string>()

  const resolvedBaseUrl = baseUrl ?? projectDir
  const resolvedPathMappings = pathMappings ?? {}

  return {
    name: "tsci-static-assets",
    resolveId(source: string, importer: string | undefined) {
      const ext = path.extname(source).toLowerCase()
      if (!STATIC_ASSET_EXTENSIONS.has(ext)) return null

      let resolvedPath: string | null = null

      // If it's already an absolute path, use it
      if (path.isAbsolute(source)) {
        if (fs.existsSync(source)) {
          resolvedPath = source
        }
      }
      // Try to resolve relative to the importer
      else if (importer && !importer.startsWith("\0")) {
        const resolvedFromImporter = path.resolve(
          path.dirname(importer),
          source,
        )
        if (fs.existsSync(resolvedFromImporter)) {
          resolvedPath = resolvedFromImporter
        }
      }

      // Try to resolve relative to projectDir (for baseUrl imports)
      if (!resolvedPath) {
        const resolvedFromProject = path.resolve(resolvedBaseUrl, source)
        if (fs.existsSync(resolvedFromProject)) {
          resolvedPath = resolvedFromProject
        }
      }

      // Try path mappings
      if (!resolvedPath) {
        for (const [pattern, targets] of Object.entries(resolvedPathMappings)) {
          const isWildcard = pattern.endsWith("/*")
          const patternPrefix = isWildcard ? pattern.slice(0, -1) : pattern

          if (
            isWildcard ? source.startsWith(patternPrefix) : source === pattern
          ) {
            const wildcard = isWildcard
              ? source.slice(patternPrefix.length)
              : ""

            for (const target of targets) {
              const targetPath = isWildcard
                ? target.replace("*", wildcard)
                : target
              const resolvedTarget = path.resolve(resolvedBaseUrl, targetPath)

              if (fs.existsSync(resolvedTarget)) {
                resolvedPath = resolvedTarget
                break
              }
            }
          }
          if (resolvedPath) break
        }
      }

      if (!resolvedPath) return null

      // Check if we've already processed this absolute path
      let relativePath = absoluteToRelative.get(resolvedPath)

      if (!relativePath) {
        // First time seeing this file - copy it with a hashed filename
        const assetDir = path.join(outputDir, "assets")
        fs.mkdirSync(assetDir, { recursive: true })

        const fileBuffer = fs.readFileSync(resolvedPath)
        const hash = createHash("sha1")
          .update(fileBuffer)
          .digest("hex")
          .slice(0, 8)
        const fileName = `${path.basename(resolvedPath, ext)}-${hash}${ext}`
        const outputPath = path.join(assetDir, fileName)

        fs.writeFileSync(outputPath, fileBuffer)
        relativePath = `./assets/${fileName}`
        absoluteToRelative.set(resolvedPath, relativePath)
      }

      // Store the mapping from this specific import source to the relative path
      // (multiple import sources might map to the same file)
      sourceToRelative.set(source, relativePath)

      // Mark as external so rollup preserves the import statement
      return {
        id: resolvedPath,
        external: true,
      }
    },
    renderChunk(code: string) {
      let modifiedCode = code

      // First pass: Replace based on original source paths (e.g., "@assets/chip.glb")
      for (const [source, relativePath] of sourceToRelative.entries()) {
        // Escape special regex characters in the source path
        const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        // Match both ESM (import) and CommonJS (require) patterns
        const patterns = [
          new RegExp(
            `(import\\s+[^'"]*from\\s+['"])${escapedSource}(['"])`,
            "g",
          ),
          new RegExp(`(require\\s*\\(['"])${escapedSource}(['"]\\))`, "g"),
        ]
        for (const pattern of patterns) {
          modifiedCode = modifiedCode.replace(pattern, `$1${relativePath}$2`)
        }
      }

      // Second pass: Replace absolute paths (Rollup sometimes outputs these)
      for (const [absolutePath, relativePath] of absoluteToRelative.entries()) {
        const escapedPath = absolutePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const patterns = [
          new RegExp(`(import\\s+[^'"]*from\\s+['"])${escapedPath}(['"])`, "g"),
          new RegExp(`(require\\s*\\(['"])${escapedPath}(['"]\\))`, "g"),
        ]
        for (const pattern of patterns) {
          modifiedCode = modifiedCode.replace(pattern, `$1${relativePath}$2`)
        }
      }
      return { code: modifiedCode }
    },
  }
}
