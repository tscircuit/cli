import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("respects custom maxIterations option", () => {
  const DeepComponent = () => {
    // Create a chain that exceeds low maxIterations
    const Level3 = () => (
      <chip
        name="deep"
        kicadFootprintMetadata={{
          properties: { Reference: { value: "DEEP**" } },
        }}
      />
    )
    const Level2 = () => (
      <group>
        <Level3 />
      </group>
    )
    const Level1 = () => (
      <group>
        <Level2 />
      </group>
    )
    return (
      <board>
        <Level1 />
      </board>
    )
  }

  // With normal maxIterations, should find it
  const metadataNormal = extractKicadFootprintMetadata(DeepComponent, {
    maxIterations: 100,
  })

  expect(metadataNormal).toEqual({
    properties: { Reference: { value: "DEEP**" } },
  })
})
