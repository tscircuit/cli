import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("component that throws when called without required props - graceful failure", () => {
  const RequiresProps = (props: { requiredProp: string }) => {
    if (!props?.requiredProp) {
      throw new Error("requiredProp is required!")
    }
    return (
      <chip
        name={props.requiredProp}
        kicadFootprintMetadata={{
          properties: {
            Reference: { value: "R**" },
          },
        }}
      />
    )
  }

  // Should not throw, should return empty object
  const metadata = extractKicadFootprintMetadata(RequiresProps as any)

  expect(metadata).toEqual({})
})
