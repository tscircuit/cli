import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("component with array children", () => {
  const ArrayChildren = () => (
    <board width="50mm" height="50mm">
      {[
        <resistor key="r1" name="R1" resistance="1k" />,
        <chip
          key="u1"
          name="U1"
          kicadFootprintMetadata={{
            properties: {
              Reference: { value: "U**" },
              Value: { value: "ArrayChip" },
            },
          }}
        />,
        <capacitor key="c1" name="C1" capacitance="100nF" />,
      ]}
    </board>
  )

  const metadata = extractKicadFootprintMetadata(ArrayChildren)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "U**" },
      Value: { value: "ArrayChip" },
    },
  })
})
