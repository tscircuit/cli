import { expect, test } from "bun:test"
import { isDrcIssue } from "lib/shared/drc-diagnostics"

test("isDrcIssue detects pcb DRC errors and warnings", () => {
  expect(
    isDrcIssue({
      type: "pcb_component_outside_board_error",
      message: "outside board",
    }),
  ).toBe(true)

  expect(
    isDrcIssue({
      type: "pcb_trace_too_close_warning",
      message: "too close",
    }),
  ).toBe(true)
})

test("isDrcIssue ignores non-DRC issues", () => {
  expect(
    isDrcIssue({
      type: "source_component_not_found_error",
      message: "missing",
    }),
  ).toBe(false)
})
