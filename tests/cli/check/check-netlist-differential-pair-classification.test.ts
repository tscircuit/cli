import { expect, test } from "bun:test"
import { isNetlistDiagnostic } from "cli/check/netlist/register"

test("only differential-pair connection properties are netlist warnings", () => {
  const createPropertyWarning = (property_name: string) => ({
    type: "source_property_ignored_warning",
    property_name,
  })

  expect(isNetlistDiagnostic(createPropertyWarning("positiveConnection"))).toBe(
    true,
  )
  expect(isNetlistDiagnostic(createPropertyWarning("negativeConnection"))).toBe(
    true,
  )
  expect(isNetlistDiagnostic(createPropertyWarning("footprint"))).toBe(false)
})
