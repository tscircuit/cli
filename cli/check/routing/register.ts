import {
  categorizeErrorOrWarning,
  type DrcCategory,
} from "@tscircuit/circuit-json-util"
import type { PlatformConfig } from "@tscircuit/props"
import type { Command } from "commander"
import {
  analyzeCircuitJson,
  type CircuitJsonIssue,
} from "lib/shared/circuit-json-diagnostics"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

const normalizeCategory = (category: string): DrcCategory =>
  category === "netlist" ||
  category === "pin_specification" ||
  category === "placement" ||
  category === "routing"
    ? category
    : "unknown"

const isRoutingDiagnostic = (issue: CircuitJsonIssue) =>
  normalizeCategory(categorizeErrorOrWarning(issue)) === "routing"

const getIssueType = (issue: CircuitJsonIssue) =>
  issue.error_type ?? issue.warning_type ?? issue.type ?? "unknown_issue"

export const checkRouting = async (file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)

  const circuitJson = await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: false,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })

  const diagnostics = analyzeCircuitJson(circuitJson)
  const routingErrors = diagnostics.errors.filter(isRoutingDiagnostic)
  const routingWarnings = diagnostics.warnings.filter(isRoutingDiagnostic)

  const lines = [
    "routing drc:",
    `Errors: ${routingErrors.length}`,
    `Warnings: ${routingWarnings.length}`,
  ]

  if (routingErrors.length > 0) {
    lines.push(
      ...routingErrors.map(
        (err) => `- ${getIssueType(err)}: ${err.message ?? ""}`,
      ),
    )
  }

  if (routingWarnings.length > 0) {
    lines.push(
      ...routingWarnings.map(
        (warning) => `- ${getIssueType(warning)}: ${warning.message ?? ""}`,
      ),
    )
  }

  return lines.join("\n")
}

export const registerCheckRouting = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("routing")
    .description("Run the autorouter and validate the routing")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const output = await checkRouting(file)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
