import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("full kicadFootprintMetadata with all properties", () => {
  const FullMetadataComponent = () => (
    <chip
      name="U1"
      kicadFootprintMetadata={{
        footprintName: "CustomFootprint",
        version: 20250122,
        generator: "tscircuit",
        generatorVersion: "1.0.0",
        layer: "F.Cu",
        properties: {
          Reference: { value: "SW**", layer: "F.SilkS" },
          Value: { value: "MX_SWITCH", layer: "F.Fab" },
          Datasheet: {
            value: "https://example.com/datasheet.pdf",
            hide: true,
          },
          Description: {
            value: "Cherry MX mechanical key switch",
            hide: true,
          },
        },
        attributes: {
          through_hole: true,
          exclude_from_bom: false,
        },
        model: {
          path: "${KIPRJMOD}/3dmodels/switch.step",
          offset: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          rotate: { x: 0, y: 0, z: 0 },
        },
      }}
    />
  )

  const metadata = extractKicadFootprintMetadata(FullMetadataComponent)

  expect(metadata.footprintName).toBe("CustomFootprint")
  expect(metadata.version).toBe(20250122)
  expect(metadata.generator).toBe("tscircuit")
  expect(metadata.properties?.Reference?.value).toBe("SW**")
  expect(metadata.properties?.Datasheet?.hide).toBe(true)
  expect(metadata.attributes?.through_hole).toBe(true)
  expect(metadata.model?.path).toBe("${KIPRJMOD}/3dmodels/switch.step")
})
