import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("nested component where inner component requires props - finds outer metadata first", () => {
  const InnerRequiresProps = (props: { essential: boolean }) => {
    if (!props?.essential) {
      throw new Error("essential prop required!")
    }
    return <chip name="inner" />
  }

  // Outer has metadata, inner would fail
  const OuterWithMetadata = () => (
    <board width="10mm" height="10mm">
      <chip
        name="outer"
        kicadFootprintMetadata={{
          properties: {
            Reference: { value: "O**" },
            Value: { value: "OuterChip" },
          },
        }}
      />
      <InnerRequiresProps essential={true} />
    </board>
  )

  const metadata = extractKicadFootprintMetadata(OuterWithMetadata)

  // Should find the metadata on the outer chip before hitting the inner failure
  expect(metadata).toEqual({
    properties: {
      Reference: { value: "O**" },
      Value: { value: "OuterChip" },
    },
  })
})
