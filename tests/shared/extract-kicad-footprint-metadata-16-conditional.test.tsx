import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("component with conditional rendering", () => {
  const ConditionalComponent = (props: { showMetadata?: boolean }) => {
    const { showMetadata = true } = props ?? {}

    return (
      <board width="20mm" height="20mm">
        {showMetadata ? (
          <chip
            name="U1"
            kicadFootprintMetadata={{
              properties: {
                Reference: { value: "COND**" },
              },
            }}
          />
        ) : (
          <chip name="U2" />
        )}
      </board>
    )
  }

  // Default should show metadata
  const metadata = extractKicadFootprintMetadata(ConditionalComponent)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "COND**" },
    },
  })
})
