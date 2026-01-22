import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("basic component with kicadFootprintMetadata directly on chip", () => {
  const SimpleChip = () => (
    <chip
      name="U1"
      kicadFootprintMetadata={{
        properties: {
          Reference: { value: "U**" },
          Value: { value: "SimpleChip" },
        },
      }}
    />
  )

  const metadata = extractKicadFootprintMetadata(SimpleChip)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "U**" },
      Value: { value: "SimpleChip" },
    },
  })
})
