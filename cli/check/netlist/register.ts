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

const POLARIZED_PIN_ALIASES = new Set(["anode", "cathode"])

const sanitizeReadableNetlist = (
  readableNetlist: string,
  circuitJson: AnyCircuitElement[],
): string => {
  const nonPolarizedComponents = new Set<string>()
  for (const el of circuitJson) {
    if (el.type !== "source_component") continue
    if (
      el.ftype === "simple_resistor" ||
      (el.ftype === "simple_capacitor" && !(el as any).is_polarized)
    ) {
      nonPolarizedComponents.add(el.name)
    }
  }

  return readableNetlist
    .split("\n")
    .map((line) => {
      const cleanedHeader = line.replace(/\s+undefined\)$/, ")")
      const pinMatch = cleanedHeader.match(/^(\s*-\s*)([^.\s]+)\.(\S+)(.*)$/)
      if (!pinMatch) return cleanedHeader
      const [, prefix, compName, aliasesRaw, rest] = pinMatch
      if (!nonPolarizedComponents.has(compName)) return cleanedHeader
      const filteredAliases = aliasesRaw
        .split(",")
        .filter((alias) => !POLARIZED_PIN_ALIASES.has(alias.toLowerCase()))
      if (filteredAliases.length === 0) return cleanedHeader
      return `${prefix}${compName}.${filteredAliases.join(",")}${rest}`
    })
    .join("\n")
}

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
  const readableNetlist = sanitizeReadableNetlist(
    convertCircuitJsonToReadableNetlist(typedCircuitJson),
    typedCircuitJson,
  )

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
