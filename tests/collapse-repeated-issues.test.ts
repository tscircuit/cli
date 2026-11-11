import { expect, test } from "bun:test"
import {
  collapseRepeatedIssues,
  getIssueTypeCountLines,
} from "lib/shared/collapse-repeated-issues"

const issues = [
  { error_type: "pcb_trace_error", message: "trace 1" },
  { error_type: "pcb_autorouting_error", message: "routing failed" },
  { error_type: "pcb_trace_error", message: "trace 2" },
  { error_type: "pcb_trace_error", message: "trace 3" },
  { type: "pcb_via_clearance_error", message: "via 1" },
]

test("collapseRepeatedIssues keeps order and caps each type", () => {
  const { issuesToLog, omittedLines } = collapseRepeatedIssues(issues, {
    maxPerType: 2,
  })

  expect(issuesToLog.map((issue) => issue.message)).toEqual([
    "trace 1",
    "routing failed",
    "trace 2",
    "via 1",
  ])
  expect(omittedLines).toEqual(["… 1 more pcb_trace_error not shown"])
})

test("collapseRepeatedIssues logs everything under the cap", () => {
  const { issuesToLog, omittedLines } = collapseRepeatedIssues(issues)

  expect(issuesToLog).toEqual(issues)
  expect(omittedLines).toEqual([])
})

test("getIssueTypeCountLines sorts by count, then type", () => {
  expect(getIssueTypeCountLines(issues)).toEqual([
    "  3  pcb_trace_error",
    "  1  pcb_autorouting_error",
    "  1  pcb_via_clearance_error",
  ])
})
