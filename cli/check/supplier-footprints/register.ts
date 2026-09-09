import type { Command } from "commander"
import { getCheckSupplierFootprintsResult } from "./check-supplier-footprints"

export const registerCheckSupplierFootprints = (program: Command) => {
  program.commands
    .find((command) => command.name() === "check")!
    .command("supplier-footprints")
    .description(
      "Compare local pad numbers and fabrication geometry with supplier footprints",
    )
    .argument("[file]", "Path to the entry file or prebuilt circuit JSON")
    .action(async (file?: string) => {
      try {
        const result = await getCheckSupplierFootprintsResult(file)
        console.log(result.output)
        if (result.hasErrors) process.exitCode = 1
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
