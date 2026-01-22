import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("nested functional component - two levels deep", () => {
  const DeepChip = () => (
    <chip
      name="U1"
      kicadFootprintMetadata={{
        properties: {
          Reference: { value: "IC**" },
          Value: { value: "DeepValue" },
          Description: { value: "Deeply nested component" },
        },
      }}
    />
  )

  const MiddleWrapper = () => (
    <group>
      <DeepChip />
    </group>
  )

  const TopComponent = () => (
    <board width="30mm" height="30mm">
      <MiddleWrapper />
    </board>
  )

  const metadata = extractKicadFootprintMetadata(TopComponent)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "IC**" },
      Value: { value: "DeepValue" },
      Description: { value: "Deeply nested component" },
    },
  })
})
