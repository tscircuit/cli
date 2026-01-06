import { getVirtualFileSystemFromDirPath } from "make-vfs"
import path from "node:path"
import fs from "node:fs"
import { pathToFileURL } from "node:url"
import Debug from "debug"
import type { PlatformConfig } from "@tscircuit/props"
import { abbreviateStringifyObject } from "lib/utils/abbreviate-stringify-object"
import { importFromUserLand } from "./importFromUserLand"

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
]

type GenerateCircuitJsonOptions = {
  filePath: string
  outputDir?: string
  outputFileName?: string
  saveToFile?: boolean
  platformConfig?: PlatformConfig
}

export type GenerateCircuitJsonResult = {
  circuitJson: any
  outputPath: string
  /** Individual circuit JSONs for each named export (library mode) */
  namedExportResults?: Array<{ circuitJson: any; exportName: string }>
}

/**
 * Generates circuit JSON from a TSCircuit component file
 *
 * @param options Configuration options
 * @returns The generated circuit JSON object
 */
export async function generateCircuitJson({
  filePath,
  outputDir,
  outputFileName,
  saveToFile = false,
  platformConfig,
}: GenerateCircuitJsonOptions): Promise<GenerateCircuitJsonResult> {
  debug(`Generating circuit JSON for ${filePath}`)

  // Import React and make it globally available for packages referencing it
  const React = await importFromUserLand("react")
  ;(globalThis as any).React = React
  const userLandTscircuit = await importFromUserLand("tscircuit")

  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath)
  const projectDir = path.dirname(absoluteFilePath)
  const resolvedOutputDir = outputDir ?? projectDir

  // Get the relative path to the component from the project directory
  const relativeComponentPath = path.relative(projectDir, absoluteFilePath)

  // Create a default output filename if not provided
  const baseFileName =
    outputFileName || path.basename(absoluteFilePath).replace(/\.[^.]+$/, "")
  const outputPath = path.join(
    resolvedOutputDir,
    `${baseFileName}.circuit.json`,
  )

  debug(`Project directory: ${projectDir}`)
  debug(`Relative component path: ${relativeComponentPath}`)
  debug(`Output path: ${outputPath}`)

  // Create a virtual file system with the project files
  const fsMap = {
    ...((await getVirtualFileSystemFromDirPath({
      dirPath: projectDir,
      fileMatchFn: (filePath) => {
        const normalizedFilePath = filePath.replace(/\\/g, "/")

        // Allow .kicad_mod files from node_modules
        if (normalizedFilePath.endsWith(".kicad_mod")) {
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

  // Default export: render directly
  if (MainComponent.default) {
    const runner = new userLandTscircuit.RootCircuit({
      platform: platformConfig,
    })
    runner.add(<MainComponent.default />)
    await runner.renderUntilSettled()
    const circuitJson = await runner.getCircuitJson()

    // Save the circuit JSON to a file if requested
    if (saveToFile) {
      debug(`Saving circuit JSON to ${outputPath}`)
      fs.writeFileSync(outputPath, JSON.stringify(circuitJson, null, 2))
    }
    return { circuitJson, outputPath }
  }

  // Named exports: find all component exports (start with uppercase)
  const namedExports = Object.entries(MainComponent).filter(
    ([name, value]) =>
      name[0] === name[0].toUpperCase() && typeof value === "function",
  ) as [string, React.ComponentType<any>][]

  if (namedExports.length === 0) {
    throw new Error(
      `No component found in "${absoluteFilePath}". Make sure you export a component.`,
    )
  }

  // Single named export: render directly
  if (namedExports.length === 1) {
    const [, Component] = namedExports[0]
    const runner = new userLandTscircuit.RootCircuit({
      platform: platformConfig,
    })
    runner.add(<Component />)
    await runner.renderUntilSettled()

    // Get the circuit JSON
    const circuitJson = await runner.getCircuitJson()

    // Save the circuit JSON to a file if requested
    if (saveToFile) {
      debug(`Saving circuit JSON to ${outputPath}`)
      fs.writeFileSync(outputPath, JSON.stringify(circuitJson, null, 2))
    }
    return { circuitJson, outputPath }
  }

  // Multiple named exports: generate individual circuit JSON for each
  debug(
    `Library mode: ${namedExports.length} exports: ${namedExports.map(([n]) => n).join(", ")}`,
  )

  const namedExportResults: Array<{ circuitJson: any; exportName: string }> = []

  for (const [exportName, Component] of namedExports) {
    const runner = new userLandTscircuit.RootCircuit({
      platform: platformConfig,
    })
    runner.add(<Component name={exportName} />)
    await runner.renderUntilSettled()
    namedExportResults.push({
      circuitJson: await runner.getCircuitJson(),
      exportName,
    })
  }

  return {
    circuitJson: namedExportResults[0]?.circuitJson ?? [],
    outputPath,
    namedExportResults,
  }
}
