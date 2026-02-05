import fs from "node:fs"
import path from "node:path"

const TEXT_STATIC_ASSET_EXTENSIONS = [
  ".gltf",
  ".step",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
]

const staticAssetFilter = new RegExp(
  `(${TEXT_STATIC_ASSET_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join(
    "|",
  )})$`,
  "i",
)

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
        build.onLoad({ filter: staticAssetFilter }, (args) => {
          const baseDir = baseUrl
            ? path.resolve(process.cwd(), baseUrl)
            : process.cwd()

          const relativePath = path
            .relative(baseDir, args.path)
            .split(path.sep)
            .join("/")

          const pathStr = `./${relativePath}`

          // Return exports object with __esModule flag for proper ESM/CJS interop.
          // This fixes the issue where pre-built libraries that import .step files
          // would receive a Module object { default: "path" } instead of just the string.
          // The __esModule flag ensures proper default export resolution.
          return {
            exports: {
              __esModule: true,
              default: pathStr,
            },
            loader: "object",
          }
        })
      },
    })
  }
}
