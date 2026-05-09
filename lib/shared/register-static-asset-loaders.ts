import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"

const STATIC_ASSET_EXTENSIONS = [
  ".glb",
  ".gltf",
  ".obj",
  ".step",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
]

const staticAssetFilter = new RegExp(
  `(${STATIC_ASSET_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join(
    "|",
  )})$`,
  "i",
)

let registered = false
let activePlatformConfig: PlatformConfig | undefined

const TEXT_STATIC_ASSET_EXTENSIONS = new Set([
  ".json",
  ".txt",
  ".md",
  ".obj",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
])

const readFileContentForStaticLoader = (
  filePath: string,
): string | ArrayBufferLike => {
  const ext = path.extname(filePath).toLowerCase()

  if (TEXT_STATIC_ASSET_EXTENSIONS.has(ext)) {
    return fs.readFileSync(filePath, "utf-8")
  }

  const buffer = fs.readFileSync(filePath)
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

const getStaticFileLoader = (filePath: string) => {
  const extWithDot = path.extname(filePath).toLowerCase()
  const ext = extWithDot.replace(/^\./, "")
  return (
    activePlatformConfig?.staticFileLoaderMap?.[ext] ??
    activePlatformConfig?.staticFileLoaderMap?.[extWithDot]
  )
}

const normalizeStaticFileLoaderResult = (result: any) => {
  if (result && typeof result === "object" && result.__esModule) {
    return result
  }

  return {
    __esModule: true,
    default: result,
  }
}

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

export const registerStaticAssetLoaders = (platformConfig?: PlatformConfig) => {
  activePlatformConfig = platformConfig

  if (registered) return
  registered = true

  if (typeof Bun !== "undefined" && typeof Bun.plugin === "function") {
    const baseUrl = getBaseUrlFromTsConfig()

    Bun.plugin({
      name: "tsci-static-assets",
      setup(build) {
        build.onLoad({ filter: staticAssetFilter }, async (args) => {
          const staticFileLoader = getStaticFileLoader(args.path)
          if (staticFileLoader) {
            const loaderExports = normalizeStaticFileLoaderResult(
              await staticFileLoader(readFileContentForStaticLoader(args.path)),
            )

            return {
              exports: loaderExports,
              loader: "object",
            }
          }

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
