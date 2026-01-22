import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("deeply nested structure - 5 levels", () => {
  const Level5 = () => (
    <chip
      name="deep"
      kicadFootprintMetadata={{
        properties: {
          Reference: { value: "DEEP**" },
          Value: { value: "Level5" },
        },
      }}
    />
  )

  const Level4 = () => (
    <group>
      <Level5 />
    </group>
  )
  const Level3 = () => (
    <group>
      <Level4 />
    </group>
  )
  const Level2 = () => (
    <group>
      <Level3 />
    </group>
  )
  const Level1 = () => (
    <board width="100mm" height="100mm">
      <Level2 />
    </board>
  )

  const metadata = extractKicadFootprintMetadata(Level1)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "DEEP**" },
      Value: { value: "Level5" },
    },
  })
})
