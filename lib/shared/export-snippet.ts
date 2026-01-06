import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { convertCircuitJsonToDsnString } from "dsn-converter"
import {
  CircuitJsonToKicadPcbConverter,
  CircuitJsonToKicadSchConverter,
  CircuitJsonToKicadLibraryConverter,
} from "circuit-json-to-kicad"
import JSZip from "jszip"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import type { PlatformConfig } from "@tscircuit/props"

const writeFileAsync = promisify(fs.writeFile)

export const ALLOWED_EXPORT_FORMATS = [
  "json",
  "circuit-json",
  "schematic-svg",
  "pcb-svg",
  "gerbers",
  "readable-netlist",
  "gltf",
  "glb",
  "specctra-dsn",
  "kicad_sch",
  "kicad_pcb",
  "kicad_zip",
  "kicad-library",
] as const

export type ExportFormat = (typeof ALLOWED_EXPORT_FORMATS)[number]

const OUTPUT_EXTENSIONS: Record<ExportFormat, string> = {
  json: ".circuit.json",
  "circuit-json": ".circuit.json",
  "schematic-svg": "-schematic.svg",
  "pcb-svg": "-pcb.svg",
  gerbers: "-gerbers.zip",
  "readable-netlist": "-readable.netlist",
  gltf: ".gltf",
  glb: ".glb",
  "specctra-dsn": ".dsn",
  kicad_sch: ".kicad_sch",
  kicad_pcb: ".kicad_pcb",
  kicad_zip: "-kicad.zip",
  "kicad-library": "",
}

type ExportOptions = {
  filePath: string
  format: ExportFormat
  writeFile?: boolean
  outputPath?: string
  platformConfig?: PlatformConfig
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess: (data: {
    outputDestination: string
    outputContent: string | Buffer
  }) => void
}

export const exportSnippet = async ({
  filePath,
  format,
  outputPath,
  platformConfig,
  writeFile = true,
  onExit = (code) => process.exit(code),
  onError = (message) => console.error(message),
  onSuccess = (result: unknown) => console.log(result),
}: ExportOptions) => {
  if (!ALLOWED_EXPORT_FORMATS.includes(format)) {
    onError(`Invalid format: ${format}`)
    return onExit(1)
  }

  const projectDir = path.dirname(filePath)
  const outputBaseName = path.basename(filePath).replace(/\.[^.]+$/, "")
  const outputFileName = `${outputBaseName}${OUTPUT_EXTENSIONS[format]}`
  const outputDestination = path.join(projectDir, outputPath ?? outputFileName)

  const circuitData = await generateCircuitJson({
    filePath,
    saveToFile: format === "circuit-json",
    platformConfig,
  }).catch((err) => {
    onError(`Error generating circuit JSON: ${err}`)
    return null
  })

  if (!circuitData) return onExit(1)

  let outputContent: string | Buffer

  switch (format) {
    case "schematic-svg":
      outputContent = convertCircuitJsonToSchematicSvg(circuitData.circuitJson)
      break
    case "pcb-svg":
      outputContent = convertCircuitJsonToPcbSvg(circuitData.circuitJson)
      break
    case "specctra-dsn":
      outputContent = convertCircuitJsonToDsnString(circuitData.circuitJson)
      break
    case "readable-netlist":
      outputContent = convertCircuitJsonToReadableNetlist(
        circuitData.circuitJson,
      )
      break
    case "gltf":
      outputContent = JSON.stringify(
        await convertCircuitJsonToGltf(circuitData.circuitJson, {
          format: "gltf",
        }),
        null,
        2,
      )
      break
    case "glb":
      outputContent = Buffer.from(
        (await convertCircuitJsonToGltf(circuitData.circuitJson, {
          format: "glb",
        })) as ArrayBuffer,
      )
      break
    case "kicad_sch": {
      const converter = new CircuitJsonToKicadSchConverter(
        circuitData.circuitJson,
      )
      converter.runUntilFinished()
      outputContent = converter.getOutputString()
      break
    }
    case "kicad_pcb": {
      const converter = new CircuitJsonToKicadPcbConverter(
        circuitData.circuitJson,
      )
      converter.runUntilFinished()
      outputContent = converter.getOutputString()
      break
    }
    case "kicad_zip": {
      const schConverter = new CircuitJsonToKicadSchConverter(
        circuitData.circuitJson,
      )
      schConverter.runUntilFinished()
      const pcbConverter = new CircuitJsonToKicadPcbConverter(
        circuitData.circuitJson,
      )
      pcbConverter.runUntilFinished()

      const zip = new JSZip()
      zip.file(`${outputBaseName}.kicad_sch`, schConverter.getOutputString())
      zip.file(`${outputBaseName}.kicad_pcb`, pcbConverter.getOutputString())
      outputContent = await zip.generateAsync({ type: "nodebuffer" })
      break
    }
    case "kicad-library": {
      const libraryName = outputBaseName
      const fpLibName = outputBaseName

      // Create output directory
      const libDir = outputDestination
      fs.mkdirSync(libDir, { recursive: true })

      // Collect all footprints and symbols from individual circuit JSONs
      const allFootprints: Array<{
        footprintName: string
        kicadModString: string
      }> = []
      const allModel3dPaths: string[] = []
      let kicadSymString = ""
      let fpLibTableString = ""
      let symLibTableString = ""

      // Process each named export's circuit JSON individually
      const circuitJsonsToProcess = circuitData.namedExportResults
        ? circuitData.namedExportResults.map((r) => r.circuitJson)
        : [circuitData.circuitJson]

      for (const cj of circuitJsonsToProcess) {
        const libConverter = new CircuitJsonToKicadLibraryConverter(cj, {
          libraryName,
          footprintLibraryName: fpLibName,
        })
        libConverter.runUntilFinished()
        const libOutput = libConverter.getOutput()

        // Collect footprints (avoid duplicates by name)
        for (const fp of libOutput.footprints) {
          if (
            !allFootprints.some((f) => f.footprintName === fp.footprintName)
          ) {
            allFootprints.push(fp)
          }
        }

        // Collect 3D model paths
        for (const modelPath of libOutput.model3dSourcePaths) {
          if (!allModel3dPaths.includes(modelPath)) {
            allModel3dPaths.push(modelPath)
          }
        }

        // Use the last converter's symbol and table strings (they should be consistent)
        kicadSymString = libOutput.kicadSymString
        fpLibTableString = libOutput.fpLibTableString
        symLibTableString = libOutput.symLibTableString
      }

      // Write symbol library
      fs.writeFileSync(
        path.join(libDir, `${libraryName}.kicad_sym`),
        kicadSymString,
      )

      // Create footprint library directory and write footprints
      const fpDir = path.join(libDir, `${fpLibName}.pretty`)
      fs.mkdirSync(fpDir, { recursive: true })
      for (const fp of allFootprints) {
        fs.writeFileSync(
          path.join(fpDir, `${fp.footprintName}.kicad_mod`),
          `${fp.kicadModString}\n`,
        )
      }

      // Copy 3D model files to .3dshapes folder
      if (allModel3dPaths.length > 0) {
        const shapesDir = path.join(libDir, `${fpLibName}.3dshapes`)
        fs.mkdirSync(shapesDir, { recursive: true })
        for (const modelPath of allModel3dPaths) {
          if (fs.existsSync(modelPath)) {
            const filename = path.basename(modelPath)
            fs.copyFileSync(modelPath, path.join(shapesDir, filename))
          }
        }
      }

      // Write library tables
      fs.writeFileSync(path.join(libDir, "fp-lib-table"), fpLibTableString)
      fs.writeFileSync(path.join(libDir, "sym-lib-table"), symLibTableString)

      // For directory output, we don't write a single file
      outputContent = ""
      if (writeFile) {
        // Already wrote files above, skip the default writeFile below
        onSuccess({ outputDestination: libDir, outputContent: "" })
        return onExit(0)
      }
      break
    }
    default:
      outputContent = JSON.stringify(circuitData.circuitJson, null, 2)
  }
  if (writeFile) {
    await writeFileAsync(outputDestination, outputContent).catch((err) => {
      onError(`Error writing file: ${err}`)
      return onExit(1)
    })
  }

  onSuccess({
    outputDestination,
    outputContent,
  })

  onExit(0)
}
