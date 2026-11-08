import fs from "node:fs"
import nodeModule, { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
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
  ".kicad_sym",
]

const staticAssetFilter = new RegExp(
  `(${STATIC_ASSET_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join(
    "|",
  )})$`,
  "i",
)

const NODE_RESOLVABLE_EXTENSIONS = [
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
]

let registered = false
let activePlatformConfig: PlatformConfig | undefined
let activeProjectDir = process.cwd()
let cachedTypeScript: typeof import("typescript") | undefined

const getTypeScript = (): typeof import("typescript") => {
  if (!cachedTypeScript) {
    const require = createRequire(import.meta.url)
    cachedTypeScript = require("typescript") as typeof import("typescript")
  }
  return cachedTypeScript
}

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

const resolveStaticAssetExports = async (filePath: string) => {
  const staticFileLoader = getStaticFileLoader(filePath)
  if (staticFileLoader) {
    return normalizeStaticFileLoaderResult(
      await staticFileLoader(readFileContentForStaticLoader(filePath)),
    )
  }

  const baseUrl = getBaseUrlFromTsConfig(activeProjectDir)
  const baseDir = baseUrl
    ? path.resolve(activeProjectDir, baseUrl)
    : activeProjectDir

  const relativePath = path
    .relative(baseDir, filePath)
    .split(path.sep)
    .join("/")

  return {
    __esModule: true,
    default: `./${relativePath}`,
  }
}

const isExistingFile = (candidatePath: string): boolean => {
  try {
    return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
  } catch {
    return false
  }
}

const isExistingDirectory = (candidatePath: string): boolean => {
  try {
    return (
      fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()
    )
  } catch {
    return false
  }
}

const resolveFileWithExtensions = (candidateBase: string): string | null => {
  if (isExistingFile(candidateBase)) {
    return candidateBase
  }

  for (const ext of NODE_RESOLVABLE_EXTENSIONS) {
    const withExt = `${candidateBase}${ext}`
    if (isExistingFile(withExt)) {
      return withExt
    }
  }

  if (/\.(js|jsx)$/i.test(candidateBase)) {
    const stem = candidateBase.replace(/\.(js|jsx)$/i, "")
    for (const ext of [".tsx", ".ts"]) {
      const withTsExt = `${stem}${ext}`
      if (isExistingFile(withTsExt)) {
        return withTsExt
      }
    }
  }

  if (isExistingDirectory(candidateBase)) {
    for (const ext of NODE_RESOLVABLE_EXTENSIONS) {
      const indexFile = path.join(candidateBase, `index${ext}`)
      if (isExistingFile(indexFile)) {
        return indexFile
      }
    }
  }

  return null
}

const registerNodeModuleLoaders = () => {
  ;(globalThis as any).__tsciLoadStaticAsset = resolveStaticAssetExports

  if (typeof (nodeModule as any).registerHooks !== "function") {
    return
  }
  ;(nodeModule as any).registerHooks({
    resolve(specifier: string, context: any, nextResolve: any) {
      try {
        return nextResolve(specifier, context)
      } catch (err) {
        if (specifier.startsWith("file:")) {
          const resolved = resolveFileWithExtensions(fileURLToPath(specifier))
          if (resolved) {
            return {
              url: pathToFileURL(resolved).href,
              shortCircuit: true,
            }
          }
        } else if (
          specifier.startsWith(".") &&
          typeof context?.parentURL === "string" &&
          context.parentURL.startsWith("file:")
        ) {
          const parentDir = path.dirname(fileURLToPath(context.parentURL))
          const resolved = resolveFileWithExtensions(
            path.resolve(parentDir, specifier),
          )
          if (resolved) {
            return {
              url: pathToFileURL(resolved).href,
              shortCircuit: true,
            }
          }
        } else if (path.isAbsolute(specifier)) {
          const resolved = resolveFileWithExtensions(specifier)
          if (resolved) {
            return {
              url: pathToFileURL(resolved).href,
              shortCircuit: true,
            }
          }
        } else if (!specifier.includes(":")) {
          const baseUrl = getBaseUrlFromTsConfig(activeProjectDir)
          const baseDir = baseUrl
            ? path.resolve(activeProjectDir, baseUrl)
            : activeProjectDir
          const resolvedFromBase = resolveFileWithExtensions(
            path.resolve(baseDir, specifier),
          )
          if (resolvedFromBase) {
            return {
              url: pathToFileURL(resolvedFromBase).href,
              shortCircuit: true,
            }
          }

          for (const fallbackParent of [
            pathToFileURL(path.join(activeProjectDir, "noop.js")).href,
            import.meta.url,
          ]) {
            try {
              return nextResolve(specifier, {
                ...context,
                parentURL: fallbackParent,
              })
            } catch {}
          }
        }

        throw err
      }
    },
    load(url: string, context: any, nextLoad: any) {
      if (url.startsWith("file:")) {
        const filePath = fileURLToPath(url)

        if (
          staticAssetFilter.test(filePath) ||
          Boolean(getStaticFileLoader(filePath))
        ) {
          return {
            format: "module",
            shortCircuit: true,
            source: [
              `const loaded = await globalThis.__tsciLoadStaticAsset(${JSON.stringify(filePath)});`,
              "export const __esModule = true;",
              "export default loaded.default;",
            ].join("\n"),
          }
        }

        if (/\.(tsx|ts|jsx)$/i.test(filePath) && !filePath.endsWith(".d.ts")) {
          const sourceText = fs.readFileSync(filePath, "utf-8")
          const ts = getTypeScript()
          const { outputText } = ts.transpileModule(sourceText, {
            fileName: filePath,
            compilerOptions: {
              module: ts.ModuleKind.ESNext,
              target: ts.ScriptTarget.ESNext,
              jsx: ts.JsxEmit.React,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              resolveJsonModule: true,
            },
          })

          return {
            format: "module",
            shortCircuit: true,
            source: outputText,
          }
        }

        if (
          filePath.toLowerCase().endsWith(".json") &&
          context?.importAttributes?.type !== "json"
        ) {
          const jsonText = fs.readFileSync(filePath, "utf-8")
          return {
            format: "module",
            shortCircuit: true,
            source: `export default ${jsonText};\n`,
          }
        }
      }

      return nextLoad(url, context)
    },
  })
}

export const registerStaticAssetLoaders = (
  platformConfig?: PlatformConfig,
  projectDir = process.cwd(),
) => {
  activePlatformConfig = platformConfig

  if (registered) return
  registered = true
  activeProjectDir = projectDir

  if (typeof Bun !== "undefined" && typeof Bun.plugin === "function") {
    Bun.plugin({
      name: "tsci-static-assets",
      setup(build) {
        build.onLoad({ filter: staticAssetFilter }, async (args) => {
          const loaderExports = await resolveStaticAssetExports(args.path)

          // Return exports object with __esModule flag for proper ESM/CJS interop.
          // This fixes the issue where pre-built libraries that import .step files
          // would receive a Module object { default: "path" } instead of just the string.
          // The __esModule flag ensures proper default export resolution.
          return {
            exports: loaderExports,
            loader: "object",
          }
        })
      },
    })
    return
  }

  registerNodeModuleLoaders()
}
