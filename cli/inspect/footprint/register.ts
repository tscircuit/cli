import type { Command } from "commander"
import kleur from "kleur"
import { formatFootprintInspection } from "./format-footprint-inspection"
import { getFootprintInspection } from "./get-footprint-inspection"
import { loadFootprintForInspection } from "./load-footprint-for-inspection"

export const inspectFootprint = async (
  pathOrString: string,
  options: { json?: boolean } = {},
) => {
  const footprint = await loadFootprintForInspection(pathOrString)
  const inspection = getFootprintInspection(footprint)
  return options.json
    ? JSON.stringify(inspection, null, 2)
    : formatFootprintInspection(inspection)
}

export const registerInspectFootprint = (program: Command) => {
  program.commands
    .find((c) => c.name() === "inspect")!
    .command("footprint")
    .description(
      "Print pins, pad positions, size, and equivalent Footprinter strings (at least 95% copper IoU)",
    )
    .argument(
      "<pathOrString>",
      'Footprinter string ("soic8"), library footprint ("kicad:Resistor_SMD/R_0402_1005Metric"), or path to a .kicad_mod, component TSX or Circuit JSON file',
    )
    .option("--json", "Output the inspection as JSON")
    .action(async (pathOrString: string, options: { json?: boolean }) => {
      try {
        console.log(await inspectFootprint(pathOrString, options))
      } catch (error) {
        console.error(
          kleur.red("Failed to inspect footprint:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
