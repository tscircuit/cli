import {
  categorizeErrorOrWarning,
  type DrcCategory,
} from "@tscircuit/circuit-json-util"
import type { CircuitJsonIssue } from "lib/shared/circuit-json-diagnostics"

export type DrcIgnoreOptions = {
  ignoreNetlistDrc?: boolean
  ignorePinSpecificationDrc?: boolean
  ignorePlacementDrc?: boolean
  ignoreRoutingDrc?: boolean
}

export type DrcIgnoreCounts = Record<DrcCategory, number>

const EMPTY_IGNORE_COUNTS = (): DrcIgnoreCounts => ({
  netlist: 0,
  pin_specification: 0,
  placement: 0,
  routing: 0,
  unknown: 0,
})

const normalizeCategory = (category: string): DrcCategory =>
  category === "netlist" ||
  category === "pin_specification" ||
  category === "placement" ||
  category === "routing"
    ? category
    : "unknown"

const categorizeIssue = (issue: CircuitJsonIssue): DrcCategory =>
  normalizeCategory(categorizeErrorOrWarning(issue))

const shouldIgnoreCategory = (
  category: DrcCategory,
  ignoreOptions: DrcIgnoreOptions | undefined,
) => {
  switch (category) {
    case "netlist":
      return Boolean(ignoreOptions?.ignoreNetlistDrc)
    case "pin_specification":
      return Boolean(ignoreOptions?.ignorePinSpecificationDrc)
    case "placement":
      return Boolean(ignoreOptions?.ignorePlacementDrc)
    case "routing":
      return Boolean(ignoreOptions?.ignoreRoutingDrc)
    default:
      return false
  }
}

const filterIssues = ({
  issues,
  ignoreOptions,
  ignoredByCategory,
}: {
  issues: CircuitJsonIssue[]
  ignoreOptions?: DrcIgnoreOptions
  ignoredByCategory: DrcIgnoreCounts
}) => {
  const kept: CircuitJsonIssue[] = []
  for (const issue of issues) {
    const category = categorizeIssue(issue)
    if (shouldIgnoreCategory(category, ignoreOptions)) {
      ignoredByCategory[category] += 1
      continue
    }
    kept.push(issue)
  }
  return kept
}

export const filterDiagnosticsByDrcCategory = ({
  errors,
  warnings,
  ignoreOptions,
}: {
  errors: CircuitJsonIssue[]
  warnings: CircuitJsonIssue[]
  ignoreOptions?: DrcIgnoreOptions
}) => {
  const ignoredByCategory = EMPTY_IGNORE_COUNTS()
  const filteredErrors = filterIssues({
    issues: errors,
    ignoreOptions,
    ignoredByCategory,
  })
  const filteredWarnings = filterIssues({
    issues: warnings,
    ignoreOptions,
    ignoredByCategory,
  })

  const ignoredCount = Object.values(ignoredByCategory).reduce(
    (sum, count) => sum + count,
    0,
  )

  return {
    errors: filteredErrors,
    warnings: filteredWarnings,
    ignoredCount,
    ignoredByCategory,
  }
}

export const formatIgnoredDrcCounts = (counts: DrcIgnoreCounts): string =>
  (
    [
      ["netlist", counts.netlist],
      ["pin_specification", counts.pin_specification],
      ["placement", counts.placement],
      ["routing", counts.routing],
      ["unknown", counts.unknown],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ")
