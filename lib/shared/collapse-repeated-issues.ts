import { type CircuitJsonIssue, getIssueType } from "./circuit-json-diagnostics"

export const MAX_ISSUES_LOGGED_PER_TYPE = 10

/**
 * Picks the issues to print in full. A board that fails early can repeat one
 * diagnostic hundreds of times; only the first `maxPerType` of each type are
 * logged and the rest are reported as a count. Order is preserved, and every
 * issue stays in circuit.json.
 */
export function collapseRepeatedIssues(
  issues: CircuitJsonIssue[],
  { maxPerType = MAX_ISSUES_LOGGED_PER_TYPE }: { maxPerType?: number } = {},
): { issuesToLog: CircuitJsonIssue[]; omittedLines: string[] } {
  const countByType = new Map<string, number>()
  const issuesToLog: CircuitJsonIssue[] = []

  for (const issue of issues) {
    const issueType = getIssueType(issue)
    const count = (countByType.get(issueType) ?? 0) + 1
    countByType.set(issueType, count)
    if (count <= maxPerType) issuesToLog.push(issue)
  }

  const omittedLines: string[] = []
  for (const [issueType, count] of countByType) {
    if (count > maxPerType) {
      omittedLines.push(`… ${count - maxPerType} more ${issueType} not shown`)
    }
  }

  return { issuesToLog, omittedLines }
}

/** One line per issue type, most frequent first, e.g. "  506  pcb_trace_error". */
export function getIssueTypeCountLines(issues: CircuitJsonIssue[]): string[] {
  const countByType = new Map<string, number>()
  for (const issue of issues) {
    const issueType = getIssueType(issue)
    countByType.set(issueType, (countByType.get(issueType) ?? 0) + 1)
  }

  const width = String(Math.max(0, ...countByType.values())).length
  return [...countByType]
    .sort(([typeA, a], [typeB, b]) => b - a || typeA.localeCompare(typeB))
    .map(
      ([issueType, count]) =>
        `  ${String(count).padStart(width)}  ${issueType}`,
    )
}
