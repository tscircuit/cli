import {
  categorizeErrorOrWarning,
  type DrcCategory,
} from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
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

export const checkRouting = async (
  file?: string,
): Promise<{ output: string; hasErrors: boolean }> => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: false,
    },
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]

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
        (issue) => `- ${getIssueType(issue)}: ${issue.message ?? ""}`,
      ),
    )
  }

  if (routingWarnings.length > 0) {
    lines.push(
      ...routingWarnings.map(
        (issue) => `- ${getIssueType(issue)}: ${issue.message ?? ""}`,
      ),
    )
  }

  return { output: lines.join("\n"), hasErrors: routingErrors.length > 0 }
}

export const registerCheckRouting = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("routing")
    .description("Build and validate the routing for a circuit file")
    .argument("[file]", "Path to the entry file or circuit JSON")
    .action(async (file?: string) => {
      try {
        const { output, hasErrors } = await checkRouting(file)
        console.log(output)
        if (hasErrors) {
          process.exit(1)
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
