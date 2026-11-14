import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import {
  analyzeCircuitJson,
  formatCircuitJsonDiagnostics,
} from "lib/shared/circuit-json-diagnostics"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "./shared"

export const getCheckResult = async (file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {},
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]

  const diagnostics = analyzeCircuitJson(circuitJson)
  return {
    output: formatCircuitJsonDiagnostics(diagnostics),
    hasErrors: diagnostics.errors.length > 0,
  }
}

export const check = async (file?: string) =>
  (await getCheckResult(file)).output

export const registerCheck = (program: Command) => {
  program
    .command("check")
    .description("Partially build and validate circuit artifacts")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const { output, hasErrors } = await getCheckResult(file)
        console.log(output)
        if (hasErrors) process.exitCode = 1
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
