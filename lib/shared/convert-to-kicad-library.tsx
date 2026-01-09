import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { KicadLibraryConverter } from "circuit-json-to-kicad"
import { importFromUserLand } from "./importFromUserLand"

type ConvertToKicadLibraryOptions = {
  /** Path to the tscircuit library entrypoint file */
  filePath: string
  /** Name for the generated KiCad library */
  libraryName: string
  /** Output directory for the KiCad library files */
  outputDir: string
}

/**
 * Converts a tscircuit library to KiCad library format.
 */
export async function convertToKicadLibrary({
  filePath,
  libraryName,
  outputDir,
}: ConvertToKicadLibraryOptions) {
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath)

  // Import React and tscircuit from userland for rendering components
  const React = await importFromUserLand("react")
  ;(globalThis as any).React = React
  const userLandTscircuit = await importFromUserLand("tscircuit")

  const converter = new KicadLibraryConverter({
    libraryName,
    entrypoint: absoluteFilePath,

    buildFileToCircuitJson: async (filePath: string, componentName: string) => {
      try {
        // Import the tscircuit component module
        const module = await import(pathToFileURL(filePath).href)
        const Component = module[componentName]

        if (!Component || typeof Component !== "function") {
          return null
        }

        // Create a circuit and render the component
        const runner = new userLandTscircuit.RootCircuit()
        runner.add(<Component name={componentName} />)
        await runner.renderUntilSettled()
        return await runner.getCircuitJson()
      } catch (error) {
        console.warn(
          `Failed to build ${componentName}: ${error instanceof Error ? error.message : error}`,
        )
        return null
      }
    },

    getExportsFromTsxFile: async (filePath: string): Promise<string[]> => {
      const module = await import(pathToFileURL(filePath).href)
      return Object.keys(module)
    },

    includeBuiltins: true,
  })

  await converter.run()
  const kicadLibOutput = converter.getOutput()

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true })

  // Write all files from the kicadProjectFsMap
  for (const [relativePath, content] of Object.entries(
    kicadLibOutput.kicadProjectFsMap,
  )) {
    const fullPath = path.join(outputDir, relativePath)
    const dir = path.dirname(fullPath)
    fs.mkdirSync(dir, { recursive: true })

    if (typeof content === "string") {
      fs.writeFileSync(fullPath, content)
    } else {
      fs.writeFileSync(fullPath, content as Buffer)
    }
  }

  // Copy 3D model files to .3dshapes folder
  if (kicadLibOutput.model3dSourcePaths.length > 0) {
    const shapesDir = path.join(outputDir, `3dmodels/${libraryName}.3dshapes`)
    fs.mkdirSync(shapesDir, { recursive: true })
    for (const modelPath of kicadLibOutput.model3dSourcePaths) {
      if (fs.existsSync(modelPath)) {
        const filename = path.basename(modelPath)
        fs.copyFileSync(modelPath, path.join(shapesDir, filename))
      }
    }
  }

  return {
    outputDir,
    files: Object.keys(kicadLibOutput.kicadProjectFsMap),
  }
}
