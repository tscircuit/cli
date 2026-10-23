import path from "node:path"
import {
  type DrcCategory,
  categorizeErrorOrWarning,
} from "@tscircuit/circuit-json-util"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToReadableNetlist } from "circuit-json-to-readable-netlist"
import type { Command } from "commander"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"
import {
  type CircuitJsonIssue,
  analyzeCircuitJson,
} from "lib/shared/circuit-json-diagnostics"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"

const normalizeCategory = (category: string): DrcCategory =>
  category === "netlist" ||
  category === "pin_specification" ||
  category === "placement" ||
  category === "routing"
    ? category
    : "unknown"

const isNetlistDiagnostic = (issue: CircuitJsonIssue) =>
  normalizeCategory(categorizeErrorOrWarning(issue)) === "netlist"

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
  const resistorComponentIds = new Set(
    typedCircuitJson
      .filter(
        (el): el is Extract<AnyCircuitElement, { type: "source_component" }> =>
          el.type === "source_component" &&
          "ftype" in el &&
          el.ftype === "simple_resistor",
      )
      .map((el) => el.source_component_id),
  )
  const cleanedCircuitJson = typedCircuitJson.map((el) => {
    if (
      el.type !== "source_port" ||
      !Array.isArray(el.port_hints) ||
      !el.source_component_id ||
      !resistorComponentIds.has(el.source_component_id)
    ) {
      return el
    }
    return {
      ...el,
      port_hints: el.port_hints.filter(
        (hint) => hint !== "anode" && hint !== "cathode",
      ),
    }
  })
  const readableNetlist = convertCircuitJsonToReadableNetlist(
    cleanedCircuitJson,
  )
    .replace(/\(([^()\n]+?)\s+undefined\)/g, "($1)")
    .replace(/^([A-Za-z0-9_]+)\s+\(undefined\)$/gm, "$1")

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
