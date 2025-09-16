import type { Command } from "commander"
import { exportSnippet } from "lib/shared/export-snippet"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { circuitJsonToSpice } from "circuit-json-to-spice"

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
          const spiceNetlist = circuitJsonToSpice(circuitJson as any)
          const spiceString = spiceNetlist.toSpiceString()
          console.log(spiceString)
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
