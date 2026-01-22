import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("chip metadata takes precedence over metadata in footprint prop", () => {
  const ChipWithMetadata = () => (
    <chip
      name="U1"
      kicadFootprintMetadata={{
        properties: {
          Reference: { value: "CHIP**" },
        },
      }}
      footprint={
        <footprint>
          <smtpad shape="rect" width="1mm" height="0.5mm" />
        </footprint>
      }
    />
  )

  const metadata = extractKicadFootprintMetadata(ChipWithMetadata)

  // BFS finds chip metadata first
  expect(metadata).toEqual({
    properties: {
      Reference: { value: "CHIP**" },
    },
  })
})
