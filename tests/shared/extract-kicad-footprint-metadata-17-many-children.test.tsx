import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("max iterations prevents infinite loops and still finds metadata", () => {
  // Create a component that would cause many iterations
  const ManyChildren = () => (
    <board width="100mm" height="100mm">
      {Array.from({ length: 50 }, (_, i) => (
        <resistor key={i} name={`R${i}`} resistance="1k" />
      ))}
      <chip
        name="U1"
        kicadFootprintMetadata={{
          properties: {
            Reference: { value: "MANY**" },
          },
        }}
      />
    </board>
  )

  // Should still find the metadata within max iterations
  const metadata = extractKicadFootprintMetadata(ManyChildren)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "MANY**" },
    },
  })
})
