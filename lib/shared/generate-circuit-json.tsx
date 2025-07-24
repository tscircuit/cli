import { getVirtualFileSystemFromDirPath } from "make-vfs"
import path from "node:path/posix"
import { relative } from "node:path"
import fs from "node:fs"
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

  const userLandTscircuit = await importFromUserLand("tscircuit")

  const runner = new userLandTscircuit.RootCircuit({
    platform: platformConfig,
  })
  const projectDir = path.dirname(filePath)
  const resolvedOutputDir = outputDir || projectDir

  // Get the relative path to the component from the project directory
  const relativeComponentPath = relative(projectDir, filePath)

  // Create a default output filename if not provided
  const baseFileName =
    outputFileName || path.basename(filePath).replace(/\.[^.]+$/, "")
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
        if (filePath.includes("node_modules/")) return false
        if (filePath.includes("dist/")) return false
        if (filePath.includes("build/")) return false
        if (filePath.match(/^\.[^\/]/)) return false
        if (!ALLOWED_FILE_EXTENSIONS.includes(path.extname(filePath)))
          return false
        return true
      },
      contentFormat: "string",
    })) as Record<string, string>),
  }

  debug(`fsMap: ${abbreviateStringifyObject(fsMap)}`)

  // Execute the circuit runner with the virtual file system
  const MainComponent = await import(filePath)

  // Handle both default export and named exports
  const Component =
    MainComponent.default ||
    (Object.keys(MainComponent).find((k) => k[0] === k[0].toUpperCase()) !==
    undefined
      ? MainComponent[
          Object.keys(MainComponent).find(
            (k) => k[0] === k[0].toUpperCase(),
          ) as keyof typeof MainComponent
        ]
      : undefined)

  if (!Component) {
    throw new Error(
      `No component found in "${filePath}". Make sure you export a component.`,
    )
  }

  runner.add(<Component />)

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
