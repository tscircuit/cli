import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("nested functional component - one level deep", () => {
  const InnerChip = () => (
    <chip
      name="REF**"
      kicadFootprintMetadata={{
        properties: {
          Reference: { value: "SW**" },
          Value: { value: "MX_SWITCH" },
        },
      }}
    />
  )

  const OuterBoard = () => (
    <board width="20mm" height="20mm">
      <InnerChip />
    </board>
  )

  const metadata = extractKicadFootprintMetadata(OuterBoard)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "SW**" },
      Value: { value: "MX_SWITCH" },
    },
  })
})
