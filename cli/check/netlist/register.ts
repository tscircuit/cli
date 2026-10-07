import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import {
  categorizeErrorOrWarning,
  type DrcCategory,
} from "@tscircuit/circuit-json-util"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import {
  analyzeCircuitJson,
  type CircuitJsonIssue,
} from "lib/shared/circuit-json-diagnostics"
import path from "node:path"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"

const normalizeCategory = (category: string): DrcCategory =>
  category === "netlist" ||
  category === "pin_specification" ||
  category === "placement" ||
  category === "routing"
    ? category
    : "unknown"

const isNetlistDiagnostic = (issue: CircuitJsonIssue) =>
  normalizeCategory(categorizeErrorOrWarning(issue)) === "netlist"

const isNetlistBlockingError = (issue: CircuitJsonIssue) =>
  isNetlistDiagnostic(issue) ||
  categorizeErrorOrWarning(issue) === "source" ||
  // Construction errors are currently categorized as unknown. They invalidate
  // the source model even when the surviving netlist has no connectivity errors.
  issue.type === "source_failed_to_create_component_error" ||
  issue.error_type === "source_failed_to_create_component_error"

const resolveInputFilePath = async (file?: string) => {
  if (file) {
    return path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
  }

  const entrypoint = await getEntrypoint({
    projectDir: process.cwd(),
  })

  if (!entrypoint) {
    throw new Error("No input file provided and no entrypoint found")
  }

  return entrypoint
}

export const checkNetlist = async (file?: string) => {
  const resolvedInputFilePath = await resolveInputFilePath(file)

  const platformConfigWithCliDefaults = getPlatformConfigWithCliDefaults(
    {
      pcbDisabled: true,
      routingDisabled: true,
      placementDrcChecksDisabled: true,
    } satisfies PlatformConfig,
    { projectDir: findCircuitProjectDir(resolvedInputFilePath) },
  )

  const { circuitJson } = await getOrGenerateCircuitJson({
    filePath: resolvedInputFilePath,
    platformConfig: platformConfigWithCliDefaults,
  })

  const typedCircuitJson = circuitJson as AnyCircuitElement[]
  const diagnostics = analyzeCircuitJson(typedCircuitJson)
  const netlistErrors = diagnostics.errors.filter(isNetlistBlockingError)
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

  return {
    output: `${diagnosticsLines.join("\n")}\n\nReadable Netlist:\n${readableNetlist}`,
    errorCount: netlistErrors.length,
  }
}

export const registerCheckNetlist = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("netlist")
    .description(
      "Validate netlist and source construction; skips PCB placement and routing checks",
    )
    .argument("[file]", "Path to the entry file")
    .action(async (file?: string) => {
      try {
        const { output, errorCount } = await checkNetlist(file)
        console.log(output)
        if (errorCount > 0) {
          process.exitCode = 1
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
