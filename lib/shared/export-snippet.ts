import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToDsnString } from "dsn-converter"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { ConvertToGLB } from "gltf-import-export"
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
  "glb",
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
  glb: ".glb",
  "specctra-dsn": ".dsn",
}

type ExportOptions = {
  filePath: string
  format: ExportFormat
  writeFile?: boolean
  outputPath?: string
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
  writeFile = true,
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
    case "gltf":
      outputContent = JSON.stringify(
        await convertCircuitJsonToGltf(circuitData.circuitJson, { format: "gltf" }),
        null,
        2,
      )
      break
    case "glb":
      // Generate GLTF first, then convert to GLB using the working method
      const gltfData = await convertCircuitJsonToGltf(circuitData.circuitJson, { format: "gltf" })
      
      // Create temporary GLTF file for conversion
      const tempGltfPath = path.join(path.dirname(outputDestination), `temp_${Date.now()}.gltf`)
      const tempGlbPath = path.join(path.dirname(outputDestination), `temp_${Date.now()}.glb`)
      
      try {
        // Write temporary GLTF file
        await writeFileAsync(tempGltfPath, JSON.stringify(gltfData, null, 2))
        
        // Convert GLTF to GLB using the working library
        ConvertToGLB(gltfData, tempGltfPath, tempGlbPath)
        
        // Read the GLB result
        outputContent = await fs.promises.readFile(tempGlbPath)
        
        // Clean up temporary files
        await fs.promises.unlink(tempGltfPath).catch(() => {})
        await fs.promises.unlink(tempGlbPath).catch(() => {})
      } catch (error) {
        // Clean up temporary files on error
        await fs.promises.unlink(tempGltfPath).catch(() => {})
        await fs.promises.unlink(tempGlbPath).catch(() => {})
        throw error
      }
      break
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
}
