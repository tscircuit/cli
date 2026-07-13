import type { Command } from "commander"
import type { AnyCircuitElement } from "circuit-json"
import { circuitJsonToFootprinter } from "circuit-json-to-footprinter"
import fs from "node:fs/promises"
import path from "node:path"
import kleur from "kleur"
import { KicadFootprintToCircuitJsonConverter } from "kicad-to-circuit-json"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"

interface ConvertOptions {
  footprinter?: boolean
  json?: boolean
  name?: string
  output?: string
}

const componentExtensions = new Set([".js", ".jsx", ".ts", ".tsx"])

const convertKicadFootprintToCircuitJson = async (inputPath: string) => {
  const modContent = await fs.readFile(inputPath, "utf-8")
  const converter = new KicadFootprintToCircuitJsonConverter()
  converter.addFile(path.basename(inputPath), modContent)
  converter.runUntilFinished()
  return converter.getOutput() as AnyCircuitElement[]
}

const loadCircuitJsonForFootprinter = async (inputPath: string) => {
  const extension = path.extname(inputPath).toLowerCase()
  if (inputPath.toLowerCase().endsWith(".circuit.json")) {
    const parsed = JSON.parse(await fs.readFile(inputPath, "utf-8"))
    if (!Array.isArray(parsed)) {
      throw new Error("Circuit JSON input must contain an array of elements")
    }
    return parsed as AnyCircuitElement[]
  }

  if (extension === ".kicad_mod") {
    return convertKicadFootprintToCircuitJson(inputPath)
  }

  if (componentExtensions.has(extension)) {
    const { circuitJson } = await generateCircuitJson({
      filePath: inputPath,
      injectedProps: { name: "CONVERT" },
      platformConfig: getPlatformConfigWithCliDefaults(),
    })
    const pcbComponentCount = circuitJson.filter(
      (element) => element.type === "pcb_component",
    ).length
    if (pcbComponentCount > 1) {
      throw new Error(
        "TSX input must render one component or footprint, not an entire board",
      )
    }
    return circuitJson
  }

  throw new Error(
    "Footprinter conversion supports .tsx, .ts, .jsx, .js, .circuit.json, and .kicad_mod inputs",
  )
}

const writeFootprinterResult = async ({
  inputPath,
  options,
}: {
  inputPath: string
  options: ConvertOptions
}) => {
  const circuitJson = await loadCircuitJsonForFootprinter(inputPath)
  const inputText = await fs.readFile(inputPath, "utf-8")
  const result = circuitJsonToFootprinter(circuitJson, {
    sourceHints: [path.basename(inputPath), inputText.slice(0, 20_000)],
  })
  if (!result.best) {
    throw new Error("No compatible footprinter string was found")
  }

  const output = options.json
    ? JSON.stringify(
        {
          best: result.best,
          candidates: result.candidates,
          diagnostics: result.diagnostics,
        },
        null,
        2,
      )
    : result.best.footprinterString
  if (options.output) {
    const outputPath = path.resolve(options.output)
    await fs.writeFile(outputPath, `${output}\n`)
    console.log(kleur.green(`Converted ${outputPath}`))
    return
  }

  console.log(output)
  if (!options.json) {
    console.log(
      kleur.dim(
        `Copper IoU: ${(result.best.copperIntersectionOverUnion * 100).toFixed(
          2,
        )}%`,
      ),
    )
  }
}

export const registerConvert = (program: Command) => {
  program
    .command("convert")
    .description(
      "Convert a KiCad footprint to TSX or discover a footprinter string",
    )
    .argument("<file>", "Path to a component or footprint file")
    .option("-o, --output <path>", "Output TSX file path")
    .option("-n, --name <component>", "Component name for export")
    .option(
      "--footprinter",
      "Discover a footprinter string (implied for TSX and Circuit JSON)",
    )
    .option("--json", "Output footprinter discovery details as JSON")
    .action(async (file: string, options: ConvertOptions) => {
      try {
        const inputPath = path.resolve(file)
        const extension = path.extname(inputPath).toLowerCase()
        const shouldDiscoverFootprinter =
          options.footprinter ||
          options.json ||
          componentExtensions.has(extension) ||
          inputPath.toLowerCase().endsWith(".circuit.json")
        if (shouldDiscoverFootprinter) {
          await writeFootprinterResult({ inputPath, options })
          return
        }

        if (extension !== ".kicad_mod") {
          throw new Error(
            "TSX and Circuit JSON inputs can only be converted to footprinter strings",
          )
        }

        const circuitJson = await convertKicadFootprintToCircuitJson(inputPath)
        const componentName =
          options.name ?? path.basename(inputPath, ".kicad_mod")
        const tsx = convertCircuitJsonToTscircuit(circuitJson, {
          componentName,
        })
        const outputPath = options.output
          ? path.resolve(options.output)
          : path.join(path.dirname(inputPath), `${componentName}.tsx`)
        await fs.writeFile(outputPath, tsx)
        console.log(kleur.green(`Converted ${outputPath}`))
      } catch (error) {
        console.error(
          kleur.red("Failed to convert footprint:"),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })
}
