import type { CircuitJsonIssue } from "./circuit-json-diagnostics"

const DRC_SUFFIX_REGEX = /_(error|warning)$/

const isDrcKey = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false
  }

  const normalizedValue = value.toLowerCase()

  if (normalizedValue.includes("drc")) {
    return true
  }

  if (
    normalizedValue.startsWith("pcb_") &&
    DRC_SUFFIX_REGEX.test(normalizedValue)
  ) {
    return true
  }

  return false
}

export const isDrcIssue = (issue: CircuitJsonIssue): boolean =>
  isDrcKey(issue.type) ||
  isDrcKey((issue as { error_type?: unknown }).error_type) ||
  isDrcKey((issue as { warning_type?: unknown }).warning_type)
