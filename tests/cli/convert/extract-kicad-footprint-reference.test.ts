import { expect, test } from "bun:test"
import { extractKicadFootprintReference } from "../../../cli/convert/convert-kicad-footprint-to-tsx"

test("extractKicadFootprintReference handles KiCad 7/8 property Reference quoted", () => {
  const mod = `(property "Reference" "REF**" (at 0 -2))`
  expect(extractKicadFootprintReference(mod)).toBe("REF**")
})

test("extractKicadFootprintReference handles KiCad 7/8 property Reference unquoted", () => {
  const mod = `(property "Reference" REF** (at 0 -2))`
  expect(extractKicadFootprintReference(mod)).toBe("REF**")
})

test("extractKicadFootprintReference handles single-quoted property Reference", () => {
  const mod = `(property 'Reference' 'U1' (at 0 -2))`
  expect(extractKicadFootprintReference(mod)).toBe("U1")
})

test("extractKicadFootprintReference handles KiCad variable ${REFERENCE}", () => {
  const mod = `(property "Reference" "\${REFERENCE}" (at 0 -2))`
  expect(extractKicadFootprintReference(mod)).toBe("${REFERENCE}")
})

test("extractKicadFootprintReference handles KiCad 5/6 fp_text reference quoted", () => {
  const mod = `(fp_text reference "D*" (at 0 -2) (layer "F.SilkS"))`
  expect(extractKicadFootprintReference(mod)).toBe("D*")
})

test("extractKicadFootprintReference handles KiCad 5/6 fp_text reference unquoted", () => {
  const mod = `(fp_text reference D* (at 0 -2) (layer "F.SilkS"))`
  expect(extractKicadFootprintReference(mod)).toBe("D*")
})

test("extractKicadFootprintReference handles references with whitespace when quoted", () => {
  const mod = `(fp_text reference "R 1" (at 0 -2))`
  expect(extractKicadFootprintReference(mod)).toBe("R 1")
})

test("extractKicadFootprintReference ignores user and value text", () => {
  const mod = `(fp_text user "SOME_USER_TEXT" (at 0 -2))\n(fp_text value "VAL" (at 0 2))`
  expect(extractKicadFootprintReference(mod)).toBeNull()
})
