export type CircuitJsonIssue = {
  type: string
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
    const hasErrorByType = typeof t === "string" && t.endsWith("_error")
    const hasErrorByKey = "error_type" in item
    if (hasErrorByType || hasErrorByKey) {
      errors.push(item)
    }

    const hasWarningByType = typeof t === "string" && t.endsWith("_warning")
    const hasWarningByKey = "warning_type" in item
    if (hasWarningByType || hasWarningByKey) {
      warnings.push(item as CircuitJsonIssue)
    }
  }

  return { errors, warnings }
}
