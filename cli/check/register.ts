import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import {
  analyzeCircuitJson,
  formatCircuitJsonDiagnostics,
} from "lib/shared/circuit-json-diagnostics"
import { checkAll } from "./all"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "./shared"

type CheckOptions = {
  all?: boolean
  format?: string
}

export const check = async (file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {},
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]

  return formatCircuitJsonDiagnostics(analyzeCircuitJson(circuitJson))
}

export const registerCheck = (program: Command) => {
  program
    .command("check")
    .description("Partially build and validate circuit artifacts")
    .argument("[file]", "Path to the entry file")
    .option("--all", "Run every circuit validation from a single build")
    .option("--format <format>", "Output format: text or json", "text")
    .action(async (file?: string, options?: CheckOptions) => {
      try {
        if (options?.format !== "text" && options?.format !== "json") {
          throw new Error("--format must be either text or json")
        }
        if (options?.format === "json" && !options.all) {
          throw new Error("--format=json requires --all")
        }
        if (options?.all) {
          const report = await checkAll(file)
          console.log(
            options.format === "json"
              ? JSON.stringify(report)
              : `Errors: ${report.summary.errors}\nWarnings: ${report.summary.warnings}`,
          )
          if (!report.success) process.exitCode = 1
          return
        }
        console.log(await check(file))
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
