import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("adom pattern: component with default props", () => {
  const ComponentWithDefaults = (props: {
    type?: string
    portHints?: string[]
    pcbX?: number
    pcbY?: number
    name?: string
  }) => {
    const {
      type = "DefaultType",
      portHints = [],
      pcbX = 0,
      pcbY = 0,
      name = "D1",
    } = props ?? {}

    return (
      <chip
        name={name}
        kicadFootprintMetadata={{
          properties: {
            Reference: { value: "D**" },
            Value: { value: type },
          },
        }}
      />
    )
  }

  const metadata = extractKicadFootprintMetadata(ComponentWithDefaults)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "D**" },
      Value: { value: "DefaultType" },
    },
  })
})
