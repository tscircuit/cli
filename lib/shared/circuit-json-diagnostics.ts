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
