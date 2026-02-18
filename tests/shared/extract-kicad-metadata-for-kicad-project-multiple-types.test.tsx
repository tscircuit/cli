import { test, expect } from "bun:test"
import { extractKicadMetadataForKicadProject } from "lib/shared/extract-kicad-metadata-for-kicad-project"

test("extracts footprint metadata for multiple component types keyed by prefix", () => {
  const Board = () => (
    <board>
      <chip
        name="U1"
        kicadFootprintMetadata={{
          footprintName: "SOIC8",
          properties: {
            Reference: { value: "U" },
          },
          attributes: {
            smd: true,
          },
        }}
      />
      <chip
        name="U2"
        kicadFootprintMetadata={{
          footprintName: "SOIC8_DIFFERENT",
          properties: {
            Reference: { value: "U" },
          },
        }}
      />
      <chip
        name="J1"
        kicadFootprintMetadata={{
          footprintName: "Connector_USB",
          properties: {
            Reference: { value: "J" },
            Datasheet: { value: "https://example.com/usb.pdf" },
          },
          attributes: {
            through_hole: true,
          },
        }}
      />
      <resistor
        name="R1"
        resistance="10k"
        kicadFootprintMetadata={{
          footprintName: "R_0402",
          properties: {
            Reference: { value: "R" },
          },
        }}
      />
    </board>
  )

  const { footprintMetadataMap } = extractKicadMetadataForKicadProject(Board)

  // Should have 3 unique prefixes (U, J, R) - U2's metadata is ignored since U1 comes first
  expect(footprintMetadataMap.size).toBe(3)
  expect(Array.from(footprintMetadataMap.keys()).sort()).toMatchInlineSnapshot(`
    [
      "J",
      "R",
      "U",
    ]
  `)

  // U should use FIRST occurrence's metadata (U1, not U2)
  expect(footprintMetadataMap.get("U")?.footprintName).toBe("SOIC8")
  expect(footprintMetadataMap.get("U")?.attributes?.smd).toBe(true)

  // J should have its own metadata
  expect(footprintMetadataMap.get("J")).toMatchInlineSnapshot(`
    {
      "attributes": {
        "through_hole": true,
      },
      "footprintName": "Connector_USB",
      "properties": {
        "Datasheet": {
          "value": "https://example.com/usb.pdf",
        },
        "Reference": {
          "value": "J",
        },
      },
    }
  `)

  // R should have its metadata
  expect(footprintMetadataMap.get("R")?.footprintName).toBe("R_0402")
})
