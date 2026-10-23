import fs from "node:fs"
import module from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import type { PlatformConfig } from "@tscircuit/props"
import ts from "typescript"

const STATIC_ASSET_EXTENSIONS = [
  ".glb",
  ".gltf",
  ".obj",
  ".step",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
  ".kicad_sym",
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
  ".kicad_sym",
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
const getBaseUrlFromTsConfig = (projectDir: string): string | null => {
  const tsconfigPath = path.join(projectDir, "tsconfig.json")

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

export const registerStaticAssetLoaders = (
  platformConfig?: PlatformConfig,
  projectDir = process.cwd(),
) => {
  activePlatformConfig = platformConfig

  if (registered) return
  registered = true

  const baseUrl = getBaseUrlFromTsConfig(projectDir)

  if (typeof Bun !== "undefined" && typeof Bun.plugin === "function") {
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
            ? path.resolve(projectDir, baseUrl)
            : projectDir

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
    return
  }

  if (typeof (module as any).registerHooks === "function") {
    ;(module as any).registerHooks({
      resolve(specifier: string, context: any, nextResolve: any) {
        try {
          return nextResolve(specifier, context)
        } catch (err: any) {
          if (
            err?.code === "ERR_MODULE_NOT_FOUND" &&
            context?.parentURL?.startsWith("file:") &&
            (specifier.startsWith("./") ||
              specifier.startsWith("../") ||
              specifier.startsWith("/"))
          ) {
            const parentDir = path.dirname(fileURLToPath(context.parentURL))
            const baseCandidate = path.resolve(parentDir, specifier)
            const candidateSuffixes = [
              ".tsx",
              ".ts",
              ".jsx",
              ".js",
              "/index.tsx",
              "/index.ts",
              "/index.jsx",
              "/index.js",
            ]
            for (const suffix of candidateSuffixes) {
              const candidatePath = `${baseCandidate}${suffix}`
              if (
                fs.existsSync(candidatePath) &&
                fs.statSync(candidatePath).isFile()
              ) {
                return {
                  url: pathToFileURL(candidatePath).href,
                  shortCircuit: true,
                }
              }
            }
          }
          throw err
        }
      },
      load(url: string, context: any, nextLoad: any) {
        if (url.startsWith("file:")) {
          const filePath = fileURLToPath(url)

          if (staticAssetFilter.test(filePath)) {
            const baseDir = baseUrl
              ? path.resolve(projectDir, baseUrl)
              : projectDir
            const relativePath = path
              .relative(baseDir, filePath)
              .split(path.sep)
              .join("/")
            const pathStr = `./${relativePath}`
            return {
              format: "module",
              shortCircuit: true,
              source: `export const __esModule = true;\nexport default ${JSON.stringify(pathStr)};\n`,
            }
          }

          if (/\.(tsx|ts|jsx)$/i.test(filePath)) {
            const rawSource = fs.readFileSync(filePath, "utf-8")
            const transpiled = ts.transpileModule(rawSource, {
              fileName: filePath,
              compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2022,
                jsx: ts.JsxEmit.ReactJSX,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
              },
            })
            return {
              format: "module",
              shortCircuit: true,
              source: transpiled.outputText,
            }
          }
        }
        return nextLoad(url, context)
      },
    })
  }
}
