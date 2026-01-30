import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import {
  KicadLibraryConverter as DefaultKicadLibraryConverter,
  type KicadLibraryConverterOptions,
  type KicadLibraryConverterOutput,
} from "circuit-json-to-kicad"
import { importFromUserLand } from "./importFromUserLand"
import { extractKicadFootprintMetadata } from "./extract-kicad-footprint-metadata"
import { extractKicadSymbolMetadata } from "./extract-kicad-symbol-metadata"

/**
 * Interface for a circuit-json-to-kicad module that provides the KicadLibraryConverter.
 * This allows upstream packages to provide their own implementation for testing.
 */
export interface CircuitJsonToKicadModule {
  KicadLibraryConverter: new (
    options: KicadLibraryConverterOptions,
  ) => {
    run(): Promise<void>
    getOutput(): KicadLibraryConverterOutput
  }
}

export type ConvertToKicadLibraryOptions = {
  /** Path to the tscircuit library entrypoint file */
  filePath: string
  /** Name for the generated KiCad library */
  libraryName: string
  /** Output directory for the KiCad library files */
  outputDir: string
  /** Whether generating for KiCad PCM (prefixes footprint refs with PCM_, uses absolute 3D model paths) */
  isPcm?: boolean
  /** The KiCad PCM package identifier (e.g., "com_tscircuit_author_package") */
  kicadPcmPackageId?: string
  /**
   * Optional custom circuit-json-to-kicad module to use instead of the default.
   * This is useful for testing upstream changes to the circuit-json-to-kicad package.
   */
  circuitJsonToKicadModule?: CircuitJsonToKicadModule
}

/**
 * Converts a tscircuit library to KiCad library format.
 */
export async function convertToKicadLibrary({
  filePath,
  libraryName,
  outputDir,
  isPcm,
  kicadPcmPackageId,
  circuitJsonToKicadModule,
}: ConvertToKicadLibraryOptions) {
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath)

  // Import React and tscircuit from userland for rendering components
  const React = await importFromUserLand("react")
  ;(globalThis as any).React = React
  const userLandTscircuit = await importFromUserLand("tscircuit")

  // Use provided module or default
  const KicadLibraryConverter =
    circuitJsonToKicadModule?.KicadLibraryConverter ??
    DefaultKicadLibraryConverter

  const converter = new KicadLibraryConverter({
    kicadLibraryName: libraryName,
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
        runner.add(<Component name="REF**" />)
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

    getComponentKicadMetadata: async (
      filePath: string,
      componentName: string,
    ) => {
      try {
        const module = await import(pathToFileURL(filePath).href)
        const Component = module[componentName]

        if (!Component || typeof Component !== "function") {
          return null
        }

        return extractKicadFootprintMetadata(Component)
      } catch (error) {
        // Silently return null if we can't extract metadata
        return null
      }
    },

    getComponentKicadSymbolMetadata: async (
      filePath: string,
      componentName: string,
    ) => {
      try {
        const module = await import(pathToFileURL(filePath).href)
        const Component = module[componentName]

        if (!Component || typeof Component !== "function") {
          return null
        }

        return extractKicadSymbolMetadata(Component)
      } catch (error) {
        // Silently return null if we can't extract metadata
        return null
      }
    },

    includeBuiltins: true,
    isPcm,
    kicadPcmPackageId,
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
