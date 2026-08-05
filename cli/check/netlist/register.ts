import {
  type DrcCategory,
  categorizeErrorOrWarning,
} from "@tscircuit/circuit-json-util"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import type { Command } from "commander"
import {
  type CircuitJsonIssue,
  analyzeCircuitJson,
} from "lib/shared/circuit-json-diagnostics"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

const normalizeCategory = (category: string): DrcCategory =>
  category === "netlist" ||
  category === "pin_specification" ||
  category === "placement" ||
  category === "routing"
    ? category
    : "unknown"

const isDifferentialPairConnectionWarning = (issue: CircuitJsonIssue) =>
  [issue.type, issue.error_type, issue.warning_type].includes(
    "source_property_ignored_warning",
  ) &&
  (issue.property_name === "positiveConnection" ||
    issue.property_name === "negativeConnection")

const isNetlistDiagnostic = (issue: CircuitJsonIssue) =>
  isDifferentialPairConnectionWarning(issue) ||
  normalizeCategory(categorizeErrorOrWarning(issue)) === "netlist"

export const checkNetlist = async (file?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const typedCircuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: true,
      routingDisabled: true,
      placementDrcChecksDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]
  const diagnostics = analyzeCircuitJson(typedCircuitJson)
  const netlistErrors = diagnostics.errors.filter(isNetlistDiagnostic)
  const netlistWarnings = diagnostics.warnings.filter(isNetlistDiagnostic)
  const readableNetlist = convertCircuitJsonToReadableNetlist(typedCircuitJson)

  const diagnosticsLines = [
    `Errors: ${netlistErrors.length}`,
    `Warnings: ${netlistWarnings.length}`,
  ]

  if (netlistErrors.length > 0) {
    diagnosticsLines.push(
      ...netlistErrors.map((err) => `- ${err.type}: ${err.message ?? ""}`),
    )
  }

  if (netlistWarnings.length > 0) {
    diagnosticsLines.push(
      ...netlistWarnings.map((warning) => {
        const issueType =
          warning.warning_type ?? warning.error_type ?? warning.type
        return `- ${issueType}: ${warning.message ?? ""}`
      }),
    )
  }

  return `${diagnosticsLines.join("\n")}\n\nReadable Netlist:\n${readableNetlist}`
}

export const registerCheckNetlist = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("netlist")
    .description("Partially build and validate the netlist")
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const output = await checkNetlist(file)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
