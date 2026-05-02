import {
  categorizeErrorOrWarning,
  type DrcCategory,
} from "@tscircuit/circuit-json-util"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import {
  analyzeCircuitJson,
  type CircuitJsonIssue,
} from "lib/shared/circuit-json-diagnostics"
import path from "node:path"

const normalizeCategory = (category: string): DrcCategory =>
  category === "netlist" ||
  category === "pin_specification" ||
  category === "placement" ||
  category === "routing"
    ? category
    : "unknown"

const isRoutingDiagnostic = (issue: CircuitJsonIssue) =>
  normalizeCategory(categorizeErrorOrWarning(issue)) === "routing"

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

export const checkRouting = async (file?: string) => {
  const resolvedInputFilePath = await resolveInputFilePath(file)

  const completePlatformConfig = getCompletePlatformConfig({
    pcbDisabled: false,
    routingDisabled: false,
  } satisfies PlatformConfig)

  const { circuitJson } = await generateCircuitJson({
    filePath: resolvedInputFilePath,
    platformConfig: completePlatformConfig,
  })

  const typedCircuitJson = circuitJson as AnyCircuitElement[]
  const diagnostics = analyzeCircuitJson(typedCircuitJson)
  const routingErrors = diagnostics.errors.filter(isRoutingDiagnostic)
  const routingWarnings = diagnostics.warnings.filter(isRoutingDiagnostic)

  const lines = [
    "routing drc:",
    `Errors: ${routingErrors.length}`,
    `Warnings: ${routingWarnings.length}`,
  ]

  if (routingErrors.length > 0) {
    lines.push(
      ...routingErrors.map((err) => {
        const issueType = err.error_type ?? err.type
        return `- ${issueType}: ${err.message ?? ""}`
      }),
    )
  }

  if (routingWarnings.length > 0) {
    lines.push(
      ...routingWarnings.map((warning) => {
        const issueType = warning.warning_type ?? warning.type
        return `- ${issueType}: ${warning.message ?? ""}`
      }),
    )
  }

  return lines.join("\n")
}

export const registerCheckRouting = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("routing")
    .description("Partially build and validate the routing")
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
