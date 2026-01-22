import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("multiple siblings - first with metadata wins (BFS order)", () => {
  const MultipleSiblings = () => (
    <board width="50mm" height="50mm">
      <resistor name="R1" resistance="1k" />
      <chip
        name="U1"
        kicadFootprintMetadata={{
          properties: {
            Reference: { value: "FIRST**" },
          },
        }}
      />
      <chip
        name="U2"
        kicadFootprintMetadata={{
          properties: {
            Reference: { value: "SECOND**" },
          },
        }}
      />
    </board>
  )

  const metadata = extractKicadFootprintMetadata(MultipleSiblings)

  // BFS should find the first chip with metadata
  expect(metadata).toEqual({
    properties: {
      Reference: { value: "FIRST**" },
    },
  })
})
