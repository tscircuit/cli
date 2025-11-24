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
}: {
  outputDir: string
  projectDir: string
}) => {
  const copiedAssets = new Map<string, string>()
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
      const resolvedFromProject = path.resolve(projectDir, source)
      if (fs.existsSync(resolvedFromProject)) {
        return resolvedFromProject
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
