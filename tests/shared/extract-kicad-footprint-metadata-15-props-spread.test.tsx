import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("component that passes props to child via spread", () => {
  const Inner = (props: { name?: string; extraProp?: string }) => (
    <chip
      name={props?.name ?? "default"}
      kicadFootprintMetadata={{
        properties: {
          Reference: { value: "I**" },
          Value: { value: props?.extraProp ?? "DefaultExtra" },
        },
      }}
    />
  )

  const Outer = (props: { name?: string }) => (
    <Inner name={props?.name} extraProp="FromOuter" />
  )

  // When called with empty props, Outer still passes extraProp="FromOuter" to Inner
  const metadata = extractKicadFootprintMetadata(Outer)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "I**" },
      // extraProp is "FromOuter" because Outer hardcodes it
      Value: { value: "FromOuter" },
    },
  })
})
