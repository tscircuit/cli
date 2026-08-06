import { categorizeErrorOrWarning } from "@tscircuit/circuit-json-util"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import {
  type CircuitJsonIssue,
  analyzeCircuitJson,
  formatCircuitJsonDiagnostics,
} from "lib/shared/circuit-json-diagnostics"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

export const isSourceDiagnostic = (issue: CircuitJsonIssue) =>
  categorizeErrorOrWarning(issue) === "source"

export const checkSource = async (file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: true,
      routingDisabled: true,
      placementDrcChecksDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]
  const diagnostics = analyzeCircuitJson(circuitJson)

  return formatCircuitJsonDiagnostics({
    errors: diagnostics.errors.filter(isSourceDiagnostic),
    warnings: diagnostics.warnings.filter(isSourceDiagnostic),
  })
}

export const registerCheckSource = (program: Command) => {
  program.commands
    .find((command) => command.name() === "check")!
    .command("source")
    .description("Partially build and validate source diagnostics")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        console.log(await checkSource(file))
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
