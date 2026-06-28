import { categorizeErrorOrWarning } from "@tscircuit/circuit-json-util"

export type CircuitJsonIssue = {
  type?: string
  error_type?: string
  warning_type?: string
  message?: string
} & Record<string, any>

export type CircuitJsonIssueCategory =
  | "schematic"
  | "source"
  | "pcb"
  | "simulation"
  | "netlist"
  | "pin_specification"
  | "placement"
  | "routing"
  | "unknown"

const getIssueType = (issue: CircuitJsonIssue) =>
  issue.error_type ?? issue.warning_type ?? issue.type ?? ""

export function classifyCircuitJsonIssue(
  issue: CircuitJsonIssue,
): CircuitJsonIssueCategory {
  const drcCategory = categorizeErrorOrWarning(issue)
  if (
    drcCategory === "netlist" ||
    drcCategory === "pin_specification" ||
    drcCategory === "placement" ||
    drcCategory === "routing"
  ) {
    return drcCategory
  }

  const issueType = getIssueType(issue)
  if (issueType.startsWith("schematic_")) return "schematic"
  if (issueType.startsWith("source_")) return "source"
  if (issueType.startsWith("pcb_")) return "pcb"
  if (issueType.startsWith("simulation_")) return "simulation"

  return "unknown"
}

export function analyzeCircuitJson(circuitJson: any[]): {
  errors: CircuitJsonIssue[]
  warnings: CircuitJsonIssue[]
} {
  const errors: CircuitJsonIssue[] = []
  const warnings: CircuitJsonIssue[] = []

  for (const item of circuitJson) {
    if (!item || typeof item !== "object") continue

    const t = item.type
    const hasErrorType = typeof item.error_type === "string"
    const hasWarningType = typeof item.warning_type === "string"
    const isTypedError = typeof t === "string" && t.endsWith("_error")
    const isTypedWarning = typeof t === "string" && t.endsWith("_warning")

    if (hasErrorType || isTypedError) {
      errors.push(item as CircuitJsonIssue)
      continue
    }

    if (hasWarningType || isTypedWarning) {
      warnings.push(item as CircuitJsonIssue)
    }
  }

  return { errors, warnings }
}
