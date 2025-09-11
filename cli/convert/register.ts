import type { Command } from "commander"
import fs from "node:fs/promises"
import path from "node:path"
import kleur from "kleur"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"

export const registerConvert = (program: Command) => {
  program
    .command("convert")
    .description("Convert a .kicad_mod footprint to a tscircuit component")
    .argument("<file>", "Path to the .kicad_mod file")
    .option("-o, --output <path>", "Output TSX file path")
    .option("-n, --name <component>", "Component name for export")
    .action(
      async (file: string, options: { output?: string; name?: string }) => {
        try {
          const inputPath = path.resolve(file)
          const modContent = await fs.readFile(inputPath, "utf-8")
          const circuitJson = await parseKicadModToCircuitJson(modContent)
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
      },
    )
}
