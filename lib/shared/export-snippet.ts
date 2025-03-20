import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToDsnString } from "dsn-converter"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import fs from "node:fs"
import path from "node:path"

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

const OUTPUT_EXTENSIONS = {
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
  format?: ExportFormat
  outputPath?: string
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}
export const exportSnippet = async ({
  filePath,
  format = "circuit-json",
  outputPath,
  onExit = (code) => process.exit(code),
  onError = (message) => console.error(message),
  onSuccess = (message) => console.log(message),
}: ExportOptions) => {
  if (!ALLOWED_FORMATS.includes(format)) {
    onError(
      `Invalid format: ${format}\nSupported formats: ${ALLOWED_FORMATS.join(",")}`,
    )
    return onExit(1)
  }

  const projectDir = path.dirname(filePath)
  const output = outputPath ?? path.basename(filePath).replace(/\.[^.]+$/, "")

  // Generate the circuit JSON using the utility function
  const { circuitJson } = await generateCircuitJson({
    filePath,
    saveToFile: format === "circuit-json",
  })

  // If the format is JSON, we're already done
  if (format === "circuit-json") {
    const finalPath = path.join(projectDir, `${output}.circuit.json`)
    onSuccess(finalPath)
    return onExit(0)
  }

  // Otherwise, convert the circuit JSON to the requested format
  outputPath = path.join(
    projectDir,
    `${output}${OUTPUT_EXTENSIONS[format as ExportFormat]}`,
  )

  let outputContent: string

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
    default:
      outputContent = JSON.stringify(circuitJson)
  }

  fs.writeFileSync(outputPath, outputContent)
  onSuccess(outputPath)
  return onExit(0)
}
