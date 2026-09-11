export type CircuitJsonIssue = {
  type?: string
  error_type?: string
  warning_type?: string
  message?: string
} & Record<string, any>

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

    if (hasWarningType || isTypedWarning) {
      warnings.push(item as CircuitJsonIssue)
      continue
    }

    if (hasErrorType || isTypedError) {
      errors.push(item as CircuitJsonIssue)
    }
  }

  return { errors, warnings }
}

export function formatCircuitJsonDiagnostics({
  errors,
  warnings,
}: {
  errors: CircuitJsonIssue[]
  warnings: CircuitJsonIssue[]
}): string {
  const lines = [`Errors: ${errors.length}`, `Warnings: ${warnings.length}`]

  for (const issue of [...errors, ...warnings]) {
    const issueType =
      issue.warning_type ?? issue.error_type ?? issue.type ?? "unknown_issue"
    lines.push(`- ${issueType}: ${issue.message ?? ""}`)
  }

  return lines.join("\n")
}

// Errors that mean the circuit itself failed to build correctly (as opposed
// to DRC violations on an otherwise valid circuit). These make `tsci build`
// exit nonzero and the circuit is not counted as passed.
const CIRCUIT_FAILURE_ERROR_TYPES = new Set([
  "source_trace_not_connected_error",
  "pcb_trace_missing_error",
  "pcb_port_not_connected_error",
])

export function isCircuitFailureError(issue: CircuitJsonIssue): boolean {
  const t = issue.error_type ?? issue.type
  return typeof t === "string" && CIRCUIT_FAILURE_ERROR_TYPES.has(t)
}
