import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import type { Plugin } from "rollup"

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
}): Plugin => {
  const copiedAssets = new Map<string, string>()
  const resolvedBaseUrl = baseUrl ?? projectDir
  const resolvedPathMappings = pathMappings ?? {}

  // Track asset IDs to their output paths for the renderChunk phase
  const assetIdToOutputPath = new Map<string, string>()

  return {
    name: "tsci-static-assets",
    resolveId(source: string, importer: string | undefined) {
      const ext = path.extname(source).toLowerCase()
      if (!STATIC_ASSET_EXTENSIONS.has(ext)) return null

      // If it's already an absolute path, use it
      if (path.isAbsolute(source)) {
        return fs.existsSync(source) ? { id: source, external: true } : null
      }

      // Try to resolve relative to the importer
      if (importer) {
        const resolvedFromImporter = path.resolve(
          path.dirname(importer),
          source,
        )
        if (fs.existsSync(resolvedFromImporter)) {
          return { id: resolvedFromImporter, external: true }
        }
      }

      // Try to resolve relative to projectDir (for baseUrl imports)
      const resolvedFromProject = path.resolve(resolvedBaseUrl, source)
      if (fs.existsSync(resolvedFromProject)) {
        return { id: resolvedFromProject, external: true }
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
              return { id: resolvedTarget, external: true }
            }
          }
        }
      }

      return null
    },
    buildStart() {
      // Copy all assets that we've resolved during the build
      assetIdToOutputPath.clear()
    },
    renderChunk(code) {
      // Replace absolute asset paths with relative output paths in the generated code
      let modifiedCode = code

      for (const [assetId, outputPath] of assetIdToOutputPath) {
        // Replace any references to the absolute path with the relative output path
        modifiedCode = modifiedCode.replace(
          new RegExp(escapeRegExp(assetId), "g"),
          outputPath,
        )
      }

      return { code: modifiedCode, map: null }
    },
    generateBundle(_options, bundle) {
      // Find all external imports that are static assets and copy them
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue

        // Process imports in this chunk
        for (const importedId of chunk.imports) {
          const ext = path.extname(importedId).toLowerCase()
          if (!STATIC_ASSET_EXTENSIONS.has(ext)) continue

          // This is a static asset import - copy it and track the mapping
          if (!copiedAssets.has(importedId)) {
            const assetDir = path.join(outputDir, "assets")
            fs.mkdirSync(assetDir, { recursive: true })

            const fileBuffer = fs.readFileSync(importedId)
            const hash = createHash("sha1")
              .update(fileBuffer)
              .digest("hex")
              .slice(0, 8)
            const fileName = `${path.basename(importedId, ext)}-${hash}${ext}`
            const outputFilePath = path.join(assetDir, fileName)

            fs.writeFileSync(outputFilePath, fileBuffer)
            copiedAssets.set(importedId, `./assets/${fileName}`)
            assetIdToOutputPath.set(importedId, `./assets/${fileName}`)
          }
        }

        // Replace absolute paths in the chunk code with relative paths
        if (chunk.code) {
          let modifiedCode = chunk.code
          for (const [assetId, relativePath] of copiedAssets) {
            modifiedCode = modifiedCode.replace(
              new RegExp(escapeRegExp(assetId), "g"),
              relativePath,
            )
          }
          chunk.code = modifiedCode
        }
      }
    },
  }
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
