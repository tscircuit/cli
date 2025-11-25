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
  const copiedAssets = new Map<string, string>()
  const resolvedBaseUrl = baseUrl ?? projectDir
  const resolvedPathMappings = pathMappings ?? {}
  return {
    name: "tsci-static-assets",
    resolveId(source: string, importer: string | undefined) {
      const ext = path.extname(source).toLowerCase()
      if (!STATIC_ASSET_EXTENSIONS.has(ext)) return null

      // If it's already an absolute path, use it
      if (path.isAbsolute(source)) {
        return fs.existsSync(source) ? source : null
      }

      // Try to resolve relative to the importer
      if (importer) {
        const resolvedFromImporter = path.resolve(
          path.dirname(importer),
          source,
        )
        if (fs.existsSync(resolvedFromImporter)) {
          return resolvedFromImporter
        }
      }

      // Try to resolve relative to projectDir (for baseUrl imports)
      const resolvedFromProject = path.resolve(resolvedBaseUrl, source)
      if (fs.existsSync(resolvedFromProject)) {
        return resolvedFromProject
      }

      for (const [pattern, targets] of Object.entries(resolvedPathMappings)) {
        const isWildcard = pattern.endsWith("/*")
        const patternPrefix = isWildcard ? pattern.slice(0, -1) : pattern

        if (
          isWildcard ? source.startsWith(patternPrefix) : source === pattern
        ) {
          const wildcard = isWildcard ? source.slice(patternPrefix.length) : ""

          for (const target of targets) {
            const targetPath = isWildcard
              ? target.replace("*", wildcard)
              : target
            const resolvedTarget = path.resolve(resolvedBaseUrl, targetPath)

            if (fs.existsSync(resolvedTarget)) {
              return resolvedTarget
            }
          }
        }
      }

      return null
    },
    load(id: string) {
      const ext = path.extname(id).toLowerCase()
      if (!STATIC_ASSET_EXTENSIONS.has(ext)) return null

      const assetDir = path.join(outputDir, "assets")
      fs.mkdirSync(assetDir, { recursive: true })

      const fileBuffer = fs.readFileSync(id)
      const hash = createHash("sha1")
        .update(fileBuffer)
        .digest("hex")
        .slice(0, 8)
      const fileName = `${path.basename(id, ext)}-${hash}${ext}`
      const outputPath = path.join(assetDir, fileName)

      if (!copiedAssets.has(id)) {
        fs.writeFileSync(outputPath, fileBuffer)
        copiedAssets.set(id, outputPath)
      }

      const relativePath = `./assets/${fileName}`
      return `export default ${JSON.stringify(relativePath)};`
    },
  }
}
