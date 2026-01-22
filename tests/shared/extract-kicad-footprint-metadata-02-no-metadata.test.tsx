import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("component without kicadFootprintMetadata returns empty object", () => {
  const NoMetadata = () => <chip name="U1" footprint="soic8" />

  const metadata = extractKicadFootprintMetadata(NoMetadata)

  expect(metadata).toEqual({})
})
