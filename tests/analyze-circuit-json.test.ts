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
