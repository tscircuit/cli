import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToDsnString } from "dsn-converter"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"

const writeFileAsync = promisify(fs.writeFile)

const ALLOWED_FORMATS = [
  "json",
  "circuit-json",
  "schematic-svg",
  "pcb-svg",
  "gerbers",
  "readable-netlist",
  "gltf",
  "specctra-dsn",
] as const

export type ExportFormat = (typeof ALLOWED_FORMATS)[number]

const OUTPUT_EXTENSIONS: Record<ExportFormat, string> = {
  json: ".circuit.json",
  "circuit-json": ".circuit.json",
  "schematic-svg": "-schematic.svg",
  "pcb-svg": "-pcb.svg",
  gerbers: "-gerbers.zip",
  "readable-netlist": "-readable.netlist",
  gltf: ".gltf",
  "specctra-dsn": ".dsn",
}

type ExportOptions = {
  filePath: string
  format: ExportFormat
  outputPath?: string
  browserDownload?: boolean
  onExit?: (code: number) => void
  onError?: (message: string) => void
} & (
  | {
      browserDownload: true
      onSuccess: (data: {
        fileName: string
        mimeType: string
        binaryData: Buffer
      }) => void
    }
  | {
      browserDownload?: false
      onSuccess: (data: string) => void
    }
)

export const exportSnippet = async ({
  filePath,
  format,
  browserDownload = false,
  outputPath,
  onExit = (code) => process.exit(code),
  onError = (message) => console.error(message),
  onSuccess = (result: unknown) => console.log(result),
}: ExportOptions) => {
  if (!ALLOWED_FORMATS.includes(format)) {
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
    default:
      outputContent = JSON.stringify(circuitData.circuitJson, null, 2)
  }

  if (browserDownload) {
    const mimeType = getMimeType(format)
    const binaryData = Buffer.isBuffer(outputContent)
      ? outputContent
      : Buffer.from(outputContent, "utf-8")

    return (
      onSuccess as (data: {
        fileName: string
        mimeType: string
        binaryData: Buffer
      }) => void
    )({
      fileName: outputFileName,
      mimeType,
      binaryData,
    })
  }

  await writeFileAsync(outputDestination, outputContent).catch((err) => {
    onError(`Error writing file: ${err}`)
    return onExit(1)
  })
  ;(onSuccess as (data: string) => void)(outputDestination)
}

// Helper function to get MIME type
const getMimeType = (format: ExportFormat): string => {
  const mimeTypes: Record<ExportFormat, string> = {
    json: "application/json",
    "circuit-json": "application/json",
    "schematic-svg": "image/svg+xml",
    "pcb-svg": "image/svg+xml",
    gerbers: "application/zip",
    "readable-netlist": "text/plain",
    gltf: "model/gltf-binary",
    "specctra-dsn": "text/plain",
  }
  return mimeTypes[format] || "application/octet-stream"
}
