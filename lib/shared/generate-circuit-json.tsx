import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { PipelineModeling } from "@tscircuit/pcb-spice-pipeline"
import Debug from "debug"
import { abbreviateStringifyObject } from "lib/utils/abbreviate-stringify-object"
import { getVirtualFileSystemFromDirPath } from "make-vfs"
import {
  AutorouterDiagnostics,
  type AutorouterDiagnosticsOptions,
} from "./autorouter-diagnostics"
import { attachAutoroutingArtifacts } from "./autorouting-artifacts"
import { importFromUserLand } from "./importFromUserLand"
import { registerStaticAssetLoaders } from "./register-static-asset-loaders"
import {
  addSourceFilesystemHash,
  getSourceFilesystemMd5Hash,
} from "./circuit-json-build-cache"
import {
  SolverDiagnostics,
  type SolverDiagnosticsOptions,
} from "./solver-diagnostics"

const debug = Debug("tsci:generate-circuit-json")

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

    const loggedAsyncEffectNames = new Set<string>()

    if (
      typeof runner.isDoneRendering === "function" &&
      typeof runner.getRunningAsyncEffects === "function"
    ) {
      runner.render()

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
    } else {
      // Older project-local cores expose only the blocking render API.
      const originalRender = runner.render
      const renderDescriptor = Object.getOwnPropertyDescriptor(runner, "render")
      const onAsyncEffectStart = (event: { effectName?: string }) => {
        const effectName = event.effectName
        if (!effectName || loggedAsyncEffectNames.has(effectName)) return
        loggedAsyncEffectNames.add(effectName)
        onAsyncEffectStatus?.(effectName)
      }

      Object.defineProperty(runner, "render", {
        configurable: true,
        enumerable: renderDescriptor?.enumerable ?? false,
        writable: true,
        value: () => {
          const result = originalRender.call(runner)
          autorouterDiagnostics.checkTimeout()
          return result
        },
      })
      try {
        runner.on("asyncEffect:start", onAsyncEffectStart)
        await runner.renderUntilSettled()
      } finally {
        runner.removeListener("asyncEffect:start", onAsyncEffectStart)
        if (renderDescriptor) {
          Object.defineProperty(runner, "render", renderDescriptor)
        } else {
          delete runner.render
        }
      }
    }
    solverDiagnostics?.finalize()

    const hasImportedBoard = runner.children.some((component: any) =>
      [component, ...component.getDescendants()].some(
        (instance: any) =>
          instance[Symbol.for("pcb-spice-pipeline.imported-board.v2")],
      ),
    )
    records = hasImportedBoard
      ? (
          await importFromUserLand(
            "@tscircuit/pcb-spice-pipeline/tsx",
            projectRootDir,
          )
        ).serializeSimulation(runner)
      : await runner.getCircuitJson()
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
