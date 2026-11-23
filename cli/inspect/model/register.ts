import type { Command } from "commander"
import kleur from "kleur"
import { inspectModel, formatModelInspection } from "./inspect-model"

export const registerInspectModel = (program: Command) => {
  program.commands
    .find((c) => c.name() === "inspect")!
    .command("model")
    .description(
      "Inspect model dimensions and search for a similar Footprinter solid (>80% volume IoU)",
    )
    .argument(
      "<pathOrString>",
      "GLB, glTF, OBJ, STL, STEP, component TSX, Circuit JSON, or Footprinter string",
    )
    .option(
      "--footprint <pathOrString>",
      "Use the associated footprint to discover parameterized model candidates",
    )
    .option(
      "--unit-to-mm <factor>",
      "Millimetres per model unit for a standalone file",
      "1",
    )
    .option("--json", "Output the inspection as JSON")
    .action(
      async (
        input: string,
        options: { json?: boolean; footprint?: string; unitToMm: string },
      ) => {
        try {
          const result = await inspectModel(input, options)
          console.log(
            options.json
              ? JSON.stringify(result, null, 2)
              : formatModelInspection(result),
          )
        } catch (error) {
          console.error(
            kleur.red("Failed to inspect model:"),
            error instanceof Error ? error.message : String(error),
          )
          process.exit(1)
        }
      },
    )
}
