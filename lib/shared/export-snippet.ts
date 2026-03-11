import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
// import { getSimpleRouteJsonFromCircuitJson } from "tscircuit"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import {
  CircuitJsonToKicadPcbConverter,
  CircuitJsonToKicadSchConverter,
} from "circuit-json-to-kicad"
import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToDsnString } from "dsn-converter"
import JSZip from "jszip"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCircuitJsonToGltfOptions } from "lib/shared/get-circuit-json-to-gltf-options"
import { convertToKicadLibrary } from "./convert-to-kicad-library"
import { isCircuitJsonFile } from "./is-circuit-json-file"

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
  "srj",
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
  srj: ".simple-route.json",
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

  // Handle kicad-library separately - it doesn't need generateCircuitJson
  if (format === "kicad-library") {
    try {
      const result = await convertToKicadLibrary({
        filePath,
        libraryName: outputBaseName,
        outputDir: outputDestination,
      })
      if (writeFile) {
        onSuccess({ outputDestination: result.outputDir, outputContent: "" })
      }
      return onExit(0)
    } catch (err) {
      onError(`Error exporting KiCad library: ${err}`)
      return onExit(1)
    }
  }

  let circuitJson: AnyCircuitElement[]

  if (isCircuitJsonFile(filePath)) {
    const rawCircuitJson = await fs.promises
      .readFile(filePath, "utf-8")
      .catch((err) => {
        onError(`Error reading circuit JSON file: ${err}`)
        return null
      })

    if (!rawCircuitJson) return onExit(1)

    try {
      const parsedCircuitJson = JSON.parse(rawCircuitJson)
      if (!Array.isArray(parsedCircuitJson)) {
        onError("Error parsing circuit JSON file: expected an array")
        return onExit(1)
      }
      circuitJson = parsedCircuitJson as AnyCircuitElement[]
    } catch (err) {
      onError(`Error parsing circuit JSON file: ${err}`)
      return onExit(1)
    }
  } else {
    const circuitData = await generateCircuitJson({
      filePath,
      saveToFile: format === "circuit-json",
      platformConfig,
    }).catch((err) => {
      onError(`Error generating circuit JSON: ${err}`)
      return null
    })

    if (!circuitData) return onExit(1)
    circuitJson = circuitData.circuitJson
  }

  let outputContent: string | Buffer

  switch (format) {
    case "schematic-svg":
      outputContent = convertCircuitJsonToSchematicSvg(circuitJson)
      break
    case "pcb-svg":
      outputContent = convertCircuitJsonToPcbSvg(circuitJson)
      break
    case "specctra-dsn":
      outputContent = convertCircuitJsonToDsnString(circuitJson)
      break
    case "readable-netlist":
      outputContent = convertCircuitJsonToReadableNetlist(circuitJson)
      break
    case "gltf":
      outputContent = JSON.stringify(
        await convertCircuitJsonToGltf(
          circuitJson,
          getCircuitJsonToGltfOptions({ format: "gltf" }),
        ),
        null,
        2,
      )
      break
    case "glb":
      outputContent = Buffer.from(
        (await convertCircuitJsonToGltf(
          circuitJson,
          getCircuitJsonToGltfOptions({ format: "glb" }),
        )) as ArrayBuffer,
      )
      break
    case "srj":
      outputContent = JSON.stringify(
        // getSimpleRouteJsonFromCircuitJson({ circuitJson }),
        {},
        null,
        2,
      )
      break
    case "kicad_sch": {
      const converter = new CircuitJsonToKicadSchConverter(circuitJson)
      converter.runUntilFinished()
      outputContent = converter.getOutputString()
      break
    }
    case "kicad_pcb": {
      const converter = new CircuitJsonToKicadPcbConverter(circuitJson)
      converter.runUntilFinished()
      outputContent = converter.getOutputString()
      break
    }
    case "kicad_zip": {
      const schConverter = new CircuitJsonToKicadSchConverter(circuitJson)
      schConverter.runUntilFinished()
      const pcbConverter = new CircuitJsonToKicadPcbConverter(circuitJson)
      pcbConverter.runUntilFinished()

      const zip = new JSZip()
      zip.file(`${outputBaseName}.kicad_sch`, schConverter.getOutputString())
      zip.file(`${outputBaseName}.kicad_pcb`, pcbConverter.getOutputString())
      outputContent = await zip.generateAsync({ type: "nodebuffer" })
      break
    }
    default:
      outputContent = JSON.stringify(circuitJson, null, 2)
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
