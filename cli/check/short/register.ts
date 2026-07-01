import type { Command } from "commander"
import { checkShort, formatShortCheckResult } from "./check-short"

export const registerCheckShort = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("short")
    .description("Generate gerbers and check for accidental shorts")
    .argument("[file]", "Path to the entry file")
    .option("-o, --output <path>", "Path to write the gerbers ZIP")
    .action(async (file?: string, options?: { output?: string }) => {
      try {
        const result = await checkShort(file, options)
        console.log(formatShortCheckResult(result))
        if (result.shortCount > 0) {
          process.exit(1)
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
