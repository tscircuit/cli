import {
  analyzeAllPlacements,
  analyzeComponentPlacement,
} from "@tscircuit/circuit-json-placement-analysis"
import {
  categorizeErrorOrWarning,
  type DrcCategory,
} from "@tscircuit/circuit-json-util"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { Command } from "commander"
import {
  analyzeCircuitJson,
  type CircuitJsonIssue,
} from "lib/shared/circuit-json-diagnostics"
import { getCircuitJsonForCheck, resolveCheckInputFilePath } from "../shared"

type CircuitJsonRecord = Record<string, unknown>

const normalizeCategory = (category: string): DrcCategory =>
  category === "netlist" ||
  category === "pin_specification" ||
  category === "placement" ||
  category === "routing"
    ? category
    : "unknown"

const isPlacementDiagnostic = (issue: CircuitJsonIssue) =>
  normalizeCategory(categorizeErrorOrWarning(issue)) === "placement"

const getIssueType = (issue: CircuitJsonIssue) =>
  issue.error_type ?? issue.warning_type ?? issue.type ?? "unknown_issue"

const getScopedComponentIds = (
  circuitJson: AnyCircuitElement[],
  refdes: string,
) => {
  const sourceComponentIds = new Set<string>()
  const pcbComponentIds = new Set<string>()

  for (const item of circuitJson) {
    const record = item as CircuitJsonRecord
    if (
      record.type === "source_component" &&
      record.name === refdes &&
      typeof record.source_component_id === "string"
    ) {
      sourceComponentIds.add(record.source_component_id)
    }
  }

  for (const item of circuitJson) {
    const record = item as CircuitJsonRecord
    if (
      record.type === "pcb_component" &&
      typeof record.source_component_id === "string" &&
      sourceComponentIds.has(record.source_component_id) &&
      typeof record.pcb_component_id === "string"
    ) {
      pcbComponentIds.add(record.pcb_component_id)
    }
  }

  return { sourceComponentIds, pcbComponentIds }
}

const isIssueRelatedToRefdes = (
  issue: CircuitJsonIssue,
  refdes: string,
  scopedIds: ReturnType<typeof getScopedComponentIds>,
) => {
  if (
    typeof issue.source_component_id === "string" &&
    scopedIds.sourceComponentIds.has(issue.source_component_id)
  ) {
    return true
  }

  if (
    typeof issue.pcb_component_id === "string" &&
    scopedIds.pcbComponentIds.has(issue.pcb_component_id)
  ) {
    return true
  }

  if (
    typeof issue.component_name === "string" &&
    issue.component_name === refdes
  ) {
    return true
  }

  if (typeof issue.name === "string" && issue.name === refdes) {
    return true
  }

  return typeof issue.message === "string" && issue.message.includes(refdes)
}

const getPlacementDiagnostics = (
  circuitJson: AnyCircuitElement[],
  refdes?: string,
) => {
  const diagnostics = analyzeCircuitJson(circuitJson)
  let errors = diagnostics.errors.filter(isPlacementDiagnostic)
  let warnings = diagnostics.warnings.filter(isPlacementDiagnostic)

  if (refdes) {
    const scopedIds = getScopedComponentIds(circuitJson, refdes)
    errors = errors.filter((issue) =>
      isIssueRelatedToRefdes(issue, refdes, scopedIds),
    )
    warnings = warnings.filter((issue) =>
      isIssueRelatedToRefdes(issue, refdes, scopedIds),
    )
  }

  return { errors, warnings }
}

const formatPlacementDiagnostics = ({
  errors,
  warnings,
}: ReturnType<typeof getPlacementDiagnostics>) => {
  const lines = [
    "placement drc:",
    `Errors: ${errors.length}`,
    `Warnings: ${warnings.length}`,
  ]

  if (errors.length > 0) {
    lines.push(
      ...errors.map(
        (issue) => `- ${getIssueType(issue)}: ${issue.message ?? ""}`,
      ),
    )
  }

  if (warnings.length > 0) {
    lines.push(
      ...warnings.map(
        (issue) => `- ${getIssueType(issue)}: ${issue.message ?? ""}`,
      ),
    )
  }

  return lines.join("\n")
}

export const checkPlacement = async (file?: string, refdes?: string) => {
  const resolvedInputFilePath = await resolveCheckInputFilePath(file)
  const circuitJson = (await getCircuitJsonForCheck({
    filePath: resolvedInputFilePath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: true,
    } satisfies PlatformConfig,
    allowPrebuiltCircuitJson: true,
  })) as AnyCircuitElement[]

  const analysisReport = refdes
    ? analyzeComponentPlacement(circuitJson, refdes).getString()
    : analyzeAllPlacements(circuitJson).getString()
  const placementDiagnostics = getPlacementDiagnostics(circuitJson, refdes)

  return `${analysisReport.trimEnd()}\n\n${formatPlacementDiagnostics(
    placementDiagnostics,
  )}`
}

export const registerCheckPlacement = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("placement")
    .description("Partially build and validate the placement")
    .argument("[file]", "Path to the entry file")
    .argument("[refdes]", "Optional refdes to scope the check")
    .action(async (file?: string, refdes?: string) => {
      try {
        const output = await checkPlacement(file, refdes)
        console.log(output)
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}
