import type { Command } from "commander"
import { exportSnippet } from "lib/shared/export-snippet"

export const registerExport = (program: Command) => {
  program
    .command("export")
    .description("Export tscircuit code to various formats")
    .argument("<file>", "Path to the snippet file")
    .option("-f, --format <format>", "Output format")
    .option("-o, --output <path>", "Output file path")
    .action(async (file, options) => {
      await exportSnippet({
        filePath: file,
        format: options.format ?? "json",
        outputPath: options.output,
        onExit: (code) => process.exit(code),
        onError: (message) => console.error(message),
        onSuccess: ({ outputDestination }) =>
          console.log("Exported to " + outputDestination + "!"),
      })
    })
}
