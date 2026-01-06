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
}: GenerateCircuitJsonOptions) {
  debug(`Generating circuit JSON for ${filePath}`)

  // Import React and make it globally available for packages referencing it
  const React = await importFromUserLand("react")
  ;(globalThis as any).React = React
  const userLandTscircuit = await importFromUserLand("tscircuit")

  const runner = new userLandTscircuit.RootCircuit({
    platform: platformConfig,
  })
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

  if (MainComponent.default) {
    // Default export: render it directly (normal board/component)
    runner.add(<MainComponent.default />)
  } else {
    // No default export: render all named component exports
    // Each named export is rendered directly (must be a board-level component or wrapped in a board)
    const componentExports = Object.entries(MainComponent).filter(
      ([name, value]) =>
        name[0] === name[0].toUpperCase() && typeof value === "function",
    )

    if (componentExports.length === 0) {
      throw new Error(
        `No component found in "${absoluteFilePath}". Make sure you export a component.`,
      )
    }

    if (componentExports.length === 1) {
      // Single named export: render it directly (likely a board component)
      const [exportName, Component] = componentExports[0] as [string, any]
      debug(`Single named export: rendering ${exportName}`)
      runner.add(<Component />)
    } else {
      // Multiple named exports: library mode - wrap in a board with export names
      debug(
        `Library mode: rendering ${componentExports.length} named exports: ${componentExports.map(([name]) => name).join(", ")}`,
      )

      const LibraryBoard = () => (
        <board>
          {componentExports.map(([exportName, Component]: [string, any], i) => (
            <Component key={exportName} name={exportName} pcbX={i * 10} />
          ))}
        </board>
      )

      runner.add(<LibraryBoard />)
    }
  }

  // Wait for the circuit to be fully rendered
  await runner.renderUntilSettled()

  // Get the circuit JSON
  const circuitJson = await runner.getCircuitJson()

  // Save the circuit JSON to a file if requested
  if (saveToFile) {
    debug(`Saving circuit JSON to ${outputPath}`)
    fs.writeFileSync(outputPath, JSON.stringify(circuitJson, null, 2))
  }

  return {
    circuitJson,
    outputPath,
  }
}
