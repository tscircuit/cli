import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("null component returns empty object", () => {
  const NullComponent = () => null as any

  const metadata = extractKicadFootprintMetadata(NullComponent)

  expect(metadata).toEqual({})
})
