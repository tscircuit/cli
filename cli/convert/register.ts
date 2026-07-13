import type { Command } from "commander"
import path from "node:path"
import kleur from "kleur"
import { convertKicadFootprintToTsx } from "./convert-kicad-footprint-to-tsx"
import type { ConvertOptions } from "./convert-options"
import { discoverFootprinterFromFile } from "./discover-footprinter-from-file"

export const registerConvert = (program: Command) => {
  program
    .command("convert")
    .description(
      "Convert .kicad_mod to TSX, or discover a footprinter string with --footprinter",
    )
    .argument("<file>", "Path to .kicad_mod, TSX component, or Circuit JSON")
    .option("-o, --output <path>", "Output TSX, footprinter, or JSON path")
    .option(
      "-n, --name <component>",
      "TSX component name for .kicad_mod conversion",
    )
    .option(
      "--footprinter",
      "Discover a footprinter string instead of converting to TSX",
    )
    .option(
      "--json",
      "Output footprinter discovery details as JSON (requires --footprinter)",
    )
    .action(async (file: string, options: ConvertOptions) => {
      try {
        const inputPath = path.resolve(file)
        const extension = path.extname(inputPath).toLowerCase()
        if (options.json && !options.footprinter) {
          throw new Error("--json requires --footprinter")
        }
        if (options.footprinter) {
          await discoverFootprinterFromFile({
            inputPath,
            json: options.json,
            output: options.output,
          })
          return
        }

        if (extension !== ".kicad_mod") {
          throw new Error(
            "Only .kicad_mod inputs convert to TSX by default. Use --footprinter to discover a footprinter string from TSX or Circuit JSON.",
          )
        }

        await convertKicadFootprintToTsx({
          inputPath,
          name: options.name,
          output: options.output,
        })
      } catch (error) {
        console.error(
          kleur.red("Failed to convert footprint:"),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }
    })
}
