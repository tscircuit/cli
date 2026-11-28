import fs from "node:fs"
import nodeModule from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

type NodeResolveContext = {
  conditions?: string[]
  parentURL?: string
  importAttributes?: Record<string, string | undefined>
}

type NodeResolveResult = {
  url: string
  format?: string | null
  importAttributes?: Record<string, string | undefined>
  shortCircuit?: boolean
}

type NodeNextResolve = (
  specifier: string,
  context?: NodeResolveContext,
) => NodeResolveResult

type NodeLoadContext = {
  conditions?: string[]
  format?: string | null
  importAttributes?: Record<string, string | undefined>
}

type NodeLoadResult = {
  format: string | null | undefined
  source?: string | ArrayBuffer | NodeJS.TypedArray
  shortCircuit?: boolean
}

type NodeNextLoad = (url: string, context?: NodeLoadContext) => NodeLoadResult

type NodeTsxLoaderConfig = {
  projectDir: string
  getBaseUrl: (projectDir: string) => string | null
  staticAssetFilter: RegExp
  resolveStaticAssetPath: (filePath: string) => string
}

const NODE_RESOLVABLE_EXTENSIONS = [
  ".tsx",
  ".ts",
  ".mts",
  ".cts",
  ".jsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
]

const JS_EXTENSION_FALLBACKS: Record<string, string[]> = {
  ".js": [".ts", ".tsx", ".js", ".jsx"],
  ".jsx": [".tsx", ".ts", ".jsx"],
  ".mjs": [".mts", ".ts", ".mjs"],
  ".cjs": [".cts", ".ts", ".cjs"],
}

let activeLoaderConfig: NodeTsxLoaderConfig | undefined
let nodeHooksRegistered = false

function isExistingFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function resolveCandidateFilePath(basePath: string): string | null {
  if (isExistingFile(basePath)) {
    return basePath
  }

  const ext = path.extname(basePath).toLowerCase()
  const mappedExtensions = JS_EXTENSION_FALLBACKS[ext]
  if (mappedExtensions) {
    const stem = basePath.slice(0, -ext.length)
    for (const candidateExt of mappedExtensions) {
      const candidatePath = `${stem}${candidateExt}`
      if (isExistingFile(candidatePath)) return candidatePath
    }
  }

  for (const candidateExt of NODE_RESOLVABLE_EXTENSIONS) {
    const candidatePath = `${basePath}${candidateExt}`
    if (isExistingFile(candidatePath)) return candidatePath
  }

  for (const candidateExt of NODE_RESOLVABLE_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${candidateExt}`)
    if (isExistingFile(indexPath)) return indexPath
  }

  return null
}

function resolveSpecifierWithFallback(
  specifier: string,
  parentURL?: string,
): string | null {
  if (specifier.startsWith("file:")) {
    return resolveCandidateFilePath(fileURLToPath(new URL(specifier)))
  }

  if (path.isAbsolute(specifier)) {
    return resolveCandidateFilePath(specifier)
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentDir = parentURL?.startsWith("file:")
      ? path.dirname(fileURLToPath(new URL(parentURL)))
      : (activeLoaderConfig?.projectDir ?? process.cwd())
    return resolveCandidateFilePath(path.resolve(parentDir, specifier))
  }

  if (!activeLoaderConfig || specifier.startsWith("node:")) {
    return null
  }

  const baseUrl = activeLoaderConfig.getBaseUrl(activeLoaderConfig.projectDir)
  if (!baseUrl) return null

  const baseDir = path.resolve(activeLoaderConfig.projectDir, baseUrl)
  return resolveCandidateFilePath(path.resolve(baseDir, specifier))
}

function resolveNodeHook(
  specifier: string,
  ...rest: [NodeResolveContext, NodeNextResolve]
): NodeResolveResult {
  const [context, nextResolve] = rest
  try {
    return nextResolve(specifier, context)
  } catch (originalError) {
    const resolvedFilePath = resolveSpecifierWithFallback(
      specifier,
      context.parentURL,
    )
    if (resolvedFilePath) {
      return {
        url: pathToFileURL(resolvedFilePath).href,
        shortCircuit: true,
      }
    }
    throw originalError
  }
}

function loadNodeHook(
  url: string,
  ...rest: [NodeLoadContext, NodeNextLoad]
): NodeLoadResult {
  const [context, nextLoad] = rest
  if (!url.startsWith("file:") || !activeLoaderConfig) {
    return nextLoad(url, context)
  }

  const filePath = fileURLToPath(new URL(url))
  if (activeLoaderConfig.staticAssetFilter.test(filePath)) {
    const assetPath = activeLoaderConfig.resolveStaticAssetPath(filePath)
    return {
      format: "module",
      source: `export default ${JSON.stringify(assetPath)};\n`,
      shortCircuit: true,
    }
  }

  const isInsideNodeModules = filePath.includes(
    `${path.sep}node_modules${path.sep}`,
  )
  if (
    !isInsideNodeModules &&
    filePath.endsWith(".json") &&
    context.importAttributes?.type !== "json"
  ) {
    return {
      format: "module",
      source: `export default ${fs.readFileSync(filePath, "utf8")};\n`,
      shortCircuit: true,
    }
  }

  const isTsLike = /\.(tsx|ts|mts|cts)$/i.test(filePath)
  const isLocalJsx = !isInsideNodeModules && /\.jsx$/i.test(filePath)
  if (!isTsLike && !isLocalJsx) {
    return nextLoad(url, context)
  }

  const sourceText = fs.readFileSync(filePath, "utf8")
  const transpiled = ts.transpileModule(sourceText, {
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
    source: transpiled.outputText,
    shortCircuit: true,
  }
}

export function registerNodeTsxLoader(config: NodeTsxLoaderConfig): void {
  activeLoaderConfig = config
  if (nodeHooksRegistered || typeof Bun !== "undefined") {
    return
  }

  const registerHooksCandidate = Reflect.get(nodeModule, "registerHooks")
  if (typeof registerHooksCandidate === "function") {
    registerHooksCandidate({
      resolve: resolveNodeHook,
      load: loadNodeHook,
    })
    nodeHooksRegistered = true
  }
}
