import type { Command } from "commander"
import { createCircuitWebWorker } from "@tscircuit/eval"
import webWorkerBundleUrl from "@tscircuit/eval/blob-url"
import { getVirtualFileSystemFromDirPath } from "make-vfs"
import path from "node:path"
import fs from "node:fs"
import {
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToPcbSvg,
} from "circuit-to-svg"
import { convertCircuitJsonToDsnString } from "dsn-converter"
import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"

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

      const worker = await createCircuitWebWorker({
        webWorkerUrl: webWorkerBundleUrl,
      })

      const projectDir = path.dirname(file)

      const relativeComponentPath = path.relative(projectDir, file)

      await worker.executeWithFsMap({
        entrypoint: "entrypoint.tsx",
        fsMap: {
          ...((await getVirtualFileSystemFromDirPath({
            dirPath: projectDir,
            contentFormat: "string",
          })) as Record<string, string>),
          "entrypoint.tsx": `
import MyCircuit from "./${relativeComponentPath}"

circuit.add(<MyCircuit />)
        `,
        },
      })

      await worker.renderUntilSettled()

      const circuitJson = await worker.getCircuitJson()
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
