import { test, expect } from "bun:test"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"

test("analyzeCircuitJson categorizes warnings and errors correctly", () => {
  const circuitJson = [
    { type: "source_component", source_component_id: "sc1", name: "R1" },
    { type: "pcb_placement_warning", message: "Too close to edge" },
    { type: "pcb_component_outside_board_error", message: "Outside board" },
    { type: "normal_element" },
  ]

  const { errors, warnings } = analyzeCircuitJson(circuitJson)

  expect(warnings).toHaveLength(1)
  expect(warnings[0].type).toBe("pcb_placement_warning")
  expect(errors).toHaveLength(1)
  expect(errors[0].type).toBe("pcb_component_outside_board_error")
})
