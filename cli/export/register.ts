import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import type { Command } from "commander"
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

type Format = (typeof ALLOWED_FORMATS)[number]

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

export const registerExport = (program: Command) => {
  program
    .command("export")
    .description("Export tscircuit code to various formats")
    .argument("<file>", "Path to the snippet file")
    .option("-f, --format <format>", "Output format")
    .option("-o, --output <path>", "Output file path")
    .action(async (file, options) => {
      const { format = "circuit-json" } = options
      let { output } = options
      if (!ALLOWED_FORMATS.includes(format)) {
        throw new Error(
          `Invalid format: ${format}\nSupported formats: ${ALLOWED_FORMATS.join(",")}`,
        )
      }

      if (!output) {
        output = path.basename(file).replace(/\.[^.]+$/, "")
      }

      const projectDir = path.dirname(file)

      // Generate the circuit JSON using the utility function
      const { circuitJson } = await generateCircuitJson({
        filePath: file,
        saveToFile: format === "circuit-json",
      })

      // If the format is JSON, we're already done
      if (format === "circuit-json") {
        console.log(
          `Exported to ${path.join(projectDir, `${output}.circuit.json`)}`,
        )
        process.exit(0)
      }

      // Otherwise, convert the circuit JSON to the requested format
      const outputPath = path.join(
        projectDir,
        `${output}${OUTPUT_EXTENSIONS[format as Format]}`,
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

      console.log(`Exported to ${outputPath}`)

      process.exit(0)
    })
}
