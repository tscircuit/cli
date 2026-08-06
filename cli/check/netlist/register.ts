import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import { categorizeErrorOrWarning } from "@tscircuit/circuit-json-util"
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

export function isNetlistDiagnostic(issue: CircuitJsonIssue) {
  return categorizeErrorOrWarning(issue) === "netlist"
}

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
