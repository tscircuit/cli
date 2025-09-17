import type { Command } from "commander"
import { exportSnippet } from "lib/shared/export-snippet"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { resultToCsv } from "lib/shared/result-to-csv"
import path from "node:path"
import { promises as fs } from "node:fs"

export const registerExport = (program: Command) => {
  program
    .command("export")
    .description("Export tscircuit code to various formats")
    .argument("<file>", "Path to the package file")
    .option("-f, --format <format>", "Output format")
    .option("-o, --output <path>", "Output file path")
    .action(async (file, options) => {
      const format = options.format ?? "json"

      if (format === "spice") {
        const { circuitJson } = await generateCircuitJson({ filePath: file })
        if (circuitJson) {
          const spiceString = getSpiceWithPaddedSim(circuitJson as any)

          const outputSpicePath =
            options.output ??
            path.join(
              path.dirname(file),
              `${path.basename(file, path.extname(file))}.spice.cir`,
            )

          await fs.writeFile(outputSpicePath, spiceString)

          const { result } = await runSimulation(spiceString)

          const csvContent = resultToCsv(result)

          const outputCsvPath = outputSpicePath.replace(/\.spice\.cir$/, ".csv")

          await fs.writeFile(outputCsvPath, csvContent)
          console.log(
            `Exported to ${outputSpicePath} and ${outputCsvPath} (simulation results)!`,
          )
        }
        return
      }

      await exportSnippet({
        filePath: file,
        format,
        outputPath: options.output,
        onExit: (code) => process.exit(code),
        onError: (message) => console.error(message),
        onSuccess: ({ outputDestination }) =>
          console.log("Exported to " + outputDestination + "!"),
      })
    })
}
