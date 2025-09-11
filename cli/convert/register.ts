import type { Command } from "commander"
import path from "node:path"
import fs from "node:fs"
import kleur from "kleur"
import { prompts } from "lib/utils/prompts"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"

export const registerConvert = (program: Command) => {
  program
    .command("convert")
    .description("Convert KiCad .kicad_mod files to tscircuit format")
    .argument("<file>", "Path to the .kicad_mod file")
    .option("-o, --output <path>", "Output file path")
    .action(async (filePath: string, options: { output?: string }) => {
      const absolutePath = path.resolve(filePath)

      if (!fs.existsSync(absolutePath)) {
        console.error(kleur.red(`File not found: ${absolutePath}`))
        return process.exit(1)
      }

      if (!absolutePath.endsWith(".kicad_mod")) {
        console.error(kleur.red("File must be a .kicad_mod file"))
        return process.exit(1)
      }

      try {
        console.log(
          kleur.yellow(`Converting ${path.basename(absolutePath)}...`),
        )

        const kicadModContent = fs.readFileSync(absolutePath, "utf-8")

        // Parse KiCad mod file and convert to circuit JSON
        const circuitJson = await parseKicadModToCircuitJson(kicadModContent)

        // Convert circuit JSON to tscircuit code
        const tscircuitCode = convertCircuitJsonToTscircuit(circuitJson)

        // Determine output path
        const outputPath =
          options.output || absolutePath.replace(/\.kicad_mod$/, ".tsx")

        // Write the output file
        fs.writeFileSync(outputPath, tscircuitCode)

        console.log(kleur.green(`Successfully converted to: ${outputPath}`))
      } catch (error) {
        console.error(
          kleur.red("Failed to convert file:"),
          error instanceof Error ? error.message : error,
        )
        return process.exit(1)
      }
    })
}
