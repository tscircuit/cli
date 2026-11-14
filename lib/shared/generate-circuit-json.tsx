import fs from "node:fs"
import Module from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import type { PipelineModeling } from "@tscircuit/pcb-spice-pipeline"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import Debug from "debug"
import { resolve as resolveEsm } from "import-meta-resolve"
import { abbreviateStringifyObject } from "lib/utils/abbreviate-stringify-object"
import { getVirtualFileSystemFromDirPath } from "make-vfs"
import {
  AutorouterDiagnostics,
  type AutorouterDiagnosticsOptions,
} from "./autorouter-diagnostics"
import { attachAutoroutingArtifacts } from "./autorouting-artifacts"
import {
  addSourceFilesystemHash,
  getSourceFilesystemMd5Hash,
} from "./circuit-json-build-cache"
import { importFromUserLand } from "./importFromUserLand"
import { registerStaticAssetLoaders } from "./register-static-asset-loaders"
import {
  SolverDiagnostics,
  type SolverDiagnosticsOptions,
} from "./solver-diagnostics"

const debug = Debug("tsci:generate-circuit-json")

let isCjsCoreFallbackRegistered = false
const activeCjsFallbackEntryPaths = new Map<string, string>()

async function registerCjsCoreFallback(projectDir: string) {
  const userLandParentUrl = pathToFileURL(path.join(projectDir, "noop.js")).href
  let tscircuitParentUrl: string | undefined
  try {
    tscircuitParentUrl = resolveEsm("tscircuit", userLandParentUrl)
  } catch {
    // Ignore if tscircuit is not directly resolvable from projectDir
  }

  const moduleWithInternals = Module as typeof Module & {
    _cache?: Record<string, unknown>
    _resolveFilename?: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options?: unknown,
    ) => string
  }
  const caches = [
    moduleWithInternals._cache,
    Module.createRequire(import.meta.url).cache as
      | Record<string, unknown>
      | undefined,
  ]

  for (const specifier of ["@tscircuit/core", "react", "react/jsx-runtime"]) {
    let resolvedUrl: string | undefined
    for (const parentUrl of [
      userLandParentUrl,
      tscircuitParentUrl,
      import.meta.url,
    ]) {
      if (!parentUrl) continue
      try {
        resolvedUrl = resolveEsm(specifier, parentUrl)
        break
      } catch {}
    }
    if (!resolvedUrl) continue

    const entryPath = fileURLToPath(resolvedUrl)
    activeCjsFallbackEntryPaths.set(specifier, entryPath)
    const modNamespace = await import(resolvedUrl)
    const exportedValue =
      specifier === "@tscircuit/core"
        ? modNamespace
        : (modNamespace.default ?? modNamespace)

    for (const cache of caches) {
      if (cache && !cache[entryPath]) {
        cache[entryPath] = {
          id: entryPath,
          filename: entryPath,
          loaded: true,
          exports: exportedValue,
        }
      }
    }
  }

  if (
    !isCjsCoreFallbackRegistered &&
    typeof moduleWithInternals._resolveFilename === "function"
  ) {
    isCjsCoreFallbackRegistered = true
    const origResolveFilename = moduleWithInternals._resolveFilename
    moduleWithInternals._resolveFilename = function (
      request: string,
      parent: unknown,
      isMain: boolean,
      options?: unknown,
    ) {
      try {
        return origResolveFilename.call(this, request, parent, isMain, options)
      } catch (error) {
        const fallbackPath = activeCjsFallbackEntryPaths.get(request)
        if (fallbackPath) {
          return fallbackPath
        }
        throw error
      }
    }
  }
}

const ALLOWED_FILE_EXTENSIONS = [
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".json",
  ".txt",
  ".md",
  ".obj",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
  ".kicad_sym",
]

type GenerateCircuitJsonOptions = {
  filePath: string
  projectDir?: string
  outputDir?: string
  outputFileName?: string
  saveToFile?: boolean
  platformConfig?: PlatformConfig
  injectedProps?: Record<string, unknown>
  onAsyncEffectStatus?: (asyncEffectName: string) => void
  autorouterDiagnostics?: AutorouterDiagnosticsOptions
  solverDiagnostics?: SolverDiagnosticsOptions
  sourceFilesystemMd5Hash?: string
}

/**
 * Generates circuit JSON from a TSCircuit component file
 *
 * @param options Configuration options
 * @returns The generated circuit JSON object
 */
export async function generateCircuitJson({
  filePath,
  projectDir: projectDirOption,
  outputDir,
  outputFileName,
  saveToFile = false,
  platformConfig,
  injectedProps,
  onAsyncEffectStatus,
  autorouterDiagnostics: autorouterDiagnosticsOptions,
  solverDiagnostics: solverDiagnosticsOptions,
  sourceFilesystemMd5Hash,
}: GenerateCircuitJsonOptions) {
  debug(`Generating circuit JSON for ${filePath}`)

  const currentSourceFilesystemMd5Hash =
    sourceFilesystemMd5Hash ?? getSourceFilesystemMd5Hash(filePath)

  // Import React and make it globally available for packages referencing it
  const projectRootDir = path.resolve(projectDirOption ?? process.cwd())
  const React = await importFromUserLand("react", projectRootDir)
  ;(globalThis as any).React = React
  registerStaticAssetLoaders(platformConfig, projectRootDir)
  await registerCjsCoreFallback(projectRootDir)
  const userLandTscircuit = await importFromUserLand(
    "tscircuit",
    projectRootDir,
  )

  const runner = new userLandTscircuit.RootCircuit({
    platform: platformConfig,
  })
  const autorouterDiagnostics = new AutorouterDiagnostics(
    autorouterDiagnosticsOptions,
  )
  autorouterDiagnostics.attachToRootCircuit(runner)
  const solverDiagnostics = solverDiagnosticsOptions
    ? new SolverDiagnostics(solverDiagnosticsOptions)
    : null
  solverDiagnostics?.attachToRootCircuit(runner)
  attachAutoroutingArtifacts(runner, filePath, projectRootDir)
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRootDir, filePath)
  const sourceDir = path.dirname(absoluteFilePath)
  const resolvedOutputDir = outputDir ?? sourceDir

  // Get the relative path to the component from the project directory
  const relativeComponentPath = path.relative(sourceDir, absoluteFilePath)

  // Create a default output filename if not provided
  const baseFileName =
    outputFileName || path.basename(absoluteFilePath).replace(/\.[^.]+$/, "")
  const outputPath = path.join(
    resolvedOutputDir,
    `${baseFileName}.circuit.json`,
  )

  debug(`Project directory: ${sourceDir}`)
  debug(`Relative component path: ${relativeComponentPath}`)
  debug(`Output path: ${outputPath}`)

  // Create a virtual file system with the project files
  const fsMap = {
    ...((await getVirtualFileSystemFromDirPath({
      dirPath: sourceDir,
      fileMatchFn: (filePath) => {
        const normalizedFilePath = filePath.replace(/\\/g, "/")

        // Allow imported KiCad library files from node_modules.
        if (
          normalizedFilePath.endsWith(".kicad_mod") ||
          normalizedFilePath.endsWith(".kicad_sym")
        ) {
          return true
        }

        if (normalizedFilePath.includes("node_modules/")) return false
        if (normalizedFilePath.includes("dist/")) return false
        if (normalizedFilePath.includes("build/")) return false
        if (normalizedFilePath.match(/^\.[^/]/)) return false
        if (!ALLOWED_FILE_EXTENSIONS.includes(path.extname(normalizedFilePath)))
          return false
        return true
      },
      contentFormat: "string",
    })) as Record<string, string>),
  }

  debug(`fsMap: ${abbreviateStringifyObject(fsMap)}`)

  // Execute the circuit runner with the virtual file system
  const MainComponent = await import(pathToFileURL(absoluteFilePath).href)

  let records: AnyCircuitElement[]
  if (Array.isArray(MainComponent.circuitJson)) {
    records = MainComponent.circuitJson
  } else {
    const namedComponent = Object.keys(MainComponent).find(
      (key) => key[0] === key[0].toUpperCase(),
    )
    const Component =
      MainComponent.default ||
      (namedComponent ? MainComponent[namedComponent] : undefined)

    if (!Component) {
      throw new Error(
        `No component found in "${absoluteFilePath}". Make sure you export a component.`,
      )
    }

    runner.add(<Component {...(injectedProps ?? {})} />)

    runner.render()

    const loggedAsyncEffectNames = new Set<string>()

    while (!runner.isDoneRendering()) {
      for (const asyncEffect of runner.getRunningAsyncEffects()) {
        const asyncEffectName = asyncEffect.effectName
        if (!asyncEffectName || loggedAsyncEffectNames.has(asyncEffectName)) {
          continue
        }

        loggedAsyncEffectNames.add(asyncEffectName)
        onAsyncEffectStatus?.(asyncEffectName)
      }

      autorouterDiagnostics.checkTimeout()
      await new Promise((resolve) => setTimeout(resolve, 100))
      runner.render()
    }

    runner.emit("renderComplete")
    solverDiagnostics?.finalize()

    records = await runner.getCircuitJson()
  }

  const modeling = MainComponent.modeling as PipelineModeling | undefined
  const circuitJson = addSourceFilesystemHash(
    records,
    currentSourceFilesystemMd5Hash,
  )
  await autorouterDiagnostics.finalize(circuitJson)

  // Save the circuit JSON to a file if requested
  if (saveToFile) {
    debug(`Saving circuit JSON to ${outputPath}`)
    fs.writeFileSync(outputPath, JSON.stringify(circuitJson, null, 2))
  }

  return {
    circuitJson,
    outputPath,
    rootCircuit: runner,
    modeling,
  }
}
