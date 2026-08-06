import { expect, test } from "bun:test"
import { isNetlistDiagnostic } from "cli/check/netlist/register"

test("netlist diagnostics use explicit shared classification metadata", () => {
  const annotatedPropertyWarning = {
    type: "source_property_ignored_warning",
    property_name: "positiveConnection",
    drc_category: "netlist",
  }
  const unannotatedPropertyWarning = {
    type: "source_property_ignored_warning",
    property_name: "positiveConnection",
  }

  expect(isNetlistDiagnostic(annotatedPropertyWarning)).toBe(true)
  expect(isNetlistDiagnostic(unannotatedPropertyWarning)).toBe(false)
})
