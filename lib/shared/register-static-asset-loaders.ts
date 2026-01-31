import fs from "node:fs"
import path from "node:path"
import { parseKicadModToCircuitJson } from "kicad-component-converter"

/**
 * Static asset extensions that export file paths (not parsed)
 */
const PATH_STATIC_ASSET_EXTENSIONS = [
  ".gltf",
  ".step",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
]

const pathAssetFilter = new RegExp(
  `(${PATH_STATIC_ASSET_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join(
    "|",
  )})$`,
  "i",
)

/**
 * Filter for .kicad_mod files that get parsed to circuit JSON
 */
const kicadModFilter = /\.kicad_mod$/i

let registered = false

/**
 * Finds and reads the tsconfig.json file, returning the baseUrl if configured.
 * Returns null if no tsconfig.json is found or no baseUrl is set.
 */
const getBaseUrlFromTsConfig = (): string | null => {
  const tsconfigPath = path.join(process.cwd(), "tsconfig.json")

  try {
    if (!fs.existsSync(tsconfigPath)) {
      return null
    }

    const tsconfigContent = fs.readFileSync(tsconfigPath, "utf-8")
    const tsconfig = JSON.parse(tsconfigContent)

    if (tsconfig.compilerOptions?.baseUrl) {
      return tsconfig.compilerOptions.baseUrl
    }
  } catch {
    // Ignore errors reading/parsing tsconfig
  }

  return null
}

export const registerStaticAssetLoaders = () => {
  if (registered) return
  registered = true

  if (typeof Bun !== "undefined" && typeof Bun.plugin === "function") {
    const baseUrl = getBaseUrlFromTsConfig()

    Bun.plugin({
      name: "tsci-static-assets",
      setup(build) {
        // Handle .kicad_mod files - parse and export circuit JSON
        build.onLoad({ filter: kicadModFilter }, async (args) => {
          const content = await Bun.file(args.path).text()
          const circuitJson = await parseKicadModToCircuitJson(content)

          return {
            contents: `export default ${JSON.stringify(circuitJson)};`,
            loader: "js",
          }
        })

        // Handle other static assets - export file paths
        build.onLoad({ filter: pathAssetFilter }, (args) => {
          const baseDir = baseUrl
            ? path.resolve(process.cwd(), baseUrl)
            : process.cwd()

          const relativePath = path
            .relative(baseDir, args.path)
            .split(path.sep)
            .join("/")

          return {
            contents: `export default ${JSON.stringify(`./${relativePath}`)};`,
            loader: "js",
          }
        })
      },
    })
  }
}
