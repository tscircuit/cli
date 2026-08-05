import { test, expect } from "bun:test"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"

const sample = [
  { type: "source_component", name: "R1" },
  { type: "pcb_autorouting_error", message: "failed" },
  { type: "pcb_manual_edit_conflict_warning", message: "warn" },
  {
    type: "schematic_manual_edit_conflict_warning",
    message: "warn2",
  },
  {
    type: "other",
    error_type: "source_missing_property_error",
    message: "missing",
  },
]

test("analyzeCircuitJson detects errors and warnings", () => {
  const { errors, warnings } = analyzeCircuitJson(sample)
  expect(errors.length).toBe(2)
  expect(warnings.length).toBe(2)
})

test("analyzeCircuitJson does not double-count items with both type and error metadata", () => {
  const { errors, warnings } = analyzeCircuitJson([
    {
      type: "pcb_component_outside_board_error",
      error_type: "pcb_component_outside_board_error",
      message: "outside board",
    },
    {
      type: "source_pin_missing_trace_warning",
      warning_type: "source_pin_missing_trace_warning",
      message: "missing trace",
    },
  ])

  expect(errors).toHaveLength(1)
  expect(warnings).toHaveLength(1)
})
