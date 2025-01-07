import type { Command } from "commander"
import { createCircuitWebWorker } from "@tscircuit/eval-webworker"
import webWorkerBundleUrl from "@tscircuit/eval-webworker/blob-url"
import { getVirtualFileSystemFromDirPath } from "make-vfs"
import path from "node:path"
import fs from "node:fs"

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

      fs.writeFileSync(outputPath, JSON.stringify(circuitJson))

      console.log(`Exported to ${outputPath}`)

      process.exit(0)
    })
}
