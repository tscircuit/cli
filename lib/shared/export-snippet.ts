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
import { extractFootprintsFromPcb } from "cli/build/generate-kicad-footprint-library"

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
  "kicad-footprint-library",
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
  "kicad-footprint-library": "-footprints.zip",
  "kicad-library": "-kicad-library.zip",
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
    case "kicad-footprint-library": {
      const pcbConverter = new CircuitJsonToKicadPcbConverter(
        circuitData.circuitJson,
      )
      pcbConverter.runUntilFinished()
      const pcbContent = pcbConverter.getOutputString()

      const footprintEntries = extractFootprintsFromPcb(pcbContent)

      const zip = new JSZip()
      const libraryNames = new Set<string>()

      for (const entry of footprintEntries) {
        libraryNames.add(entry.libraryName)
        const libraryFolder = zip.folder(`${entry.libraryName}.pretty`)
        if (libraryFolder) {
          libraryFolder.file(
            `${entry.footprintName}.kicad_mod`,
            `${entry.content}\n`,
          )
        }
      }

      if (libraryNames.size > 0) {
        const libTableEntries = Array.from(libraryNames)
          .sort()
          .map(
            (name) =>
              `  (lib (name ${name}) (type KiCad) (uri \${KIPRJMOD}/${name}.pretty) (options "") (descr "Generated by tsci export"))`,
          )
        const libTableContent = `(fp_lib_table\n${libTableEntries.join("\n")}\n)\n`
        zip.file("fp-lib-table", libTableContent)
      }

      outputContent = await zip.generateAsync({ type: "nodebuffer" })
      break
    }
    case "kicad-library": {
      const libraryName = outputBaseName
      const fpLibName = outputBaseName // Use same name for symbol and footprint libraries

      // Use CircuitJsonToKicadLibraryConverter from circuit-json-to-kicad
      const libConverter = new CircuitJsonToKicadLibraryConverter(
        circuitData.circuitJson,
        {
          libraryName,
          footprintLibraryName: fpLibName,
        },
      )
      libConverter.runUntilFinished()
      const libOutput = libConverter.getOutput()

      const zip = new JSZip()

      // Add symbol library
      zip.file(`${libraryName}.kicad_sym`, libOutput.kicadSymString)

      // Add footprints
      for (const fp of libOutput.footprints) {
        const libraryFolder = zip.folder(`${fpLibName}.pretty`)
        if (libraryFolder) {
          libraryFolder.file(
            `${fp.footprintName}.kicad_mod`,
            `${fp.kicadModString}\n`,
          )
        }
      }

      // Copy 3D model files to .3dshapes folder
      for (const modelPath of libOutput.model3dSourcePaths) {
        if (fs.existsSync(modelPath)) {
          const filename = path.basename(modelPath)
          const shapesFolder = zip.folder(`${fpLibName}.3dshapes`)
          if (shapesFolder) {
            const fileContent = fs.readFileSync(modelPath)
            shapesFolder.file(filename, fileContent)
          }
        }
      }

      // Add library tables
      zip.file("fp-lib-table", libOutput.fpLibTableString)
      zip.file("sym-lib-table", libOutput.symLibTableString)

      outputContent = await zip.generateAsync({ type: "nodebuffer" })
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
