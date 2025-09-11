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
    if (typeof t === "string") {
      if (t.endsWith("_error")) errors.push(item)
      else if (t.endsWith("_warning")) warnings.push(item)
    }
    if ("error_type" in item) errors.push(item)
    if ("warning_type" in item) warnings.push(item as CircuitJsonIssue)
  }

  return { errors, warnings }
}
