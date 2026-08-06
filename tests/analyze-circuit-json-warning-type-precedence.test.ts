import { expect, test } from "bun:test"
import { analyzeCircuitJson } from "lib/shared/circuit-json-diagnostics"

test("analyzeCircuitJson prefers a warning type over error_type metadata", () => {
  const { errors, warnings } = analyzeCircuitJson([
    {
      type: "source_property_ignored_warning",
      error_type: "source_property_ignored_warning",
      property_name: "positiveConnection",
      message: "ambiguous differential-pair trace",
    },
  ])

  expect(errors).toHaveLength(0)
  expect(warnings).toHaveLength(1)
})
