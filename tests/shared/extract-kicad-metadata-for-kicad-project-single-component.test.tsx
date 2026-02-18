import { test, expect } from "bun:test"
import { extractKicadMetadataForKicadProject } from "lib/shared/extract-kicad-metadata-for-kicad-project"

test("extracts footprint metadata from board with single component", () => {
  const Board = () => (
    <board>
      <chip
        name="U1"
        kicadFootprintMetadata={{
          footprintName: "SOIC8",
          properties: {
            Reference: {
              value: "U",
              at: { x: 0, y: -3 },
              layer: "F.SilkS",
            },
            Value: {
              value: "ATmega328",
              at: { x: 0, y: 3 },
              layer: "F.Fab",
            },
          },
          model: {
            path: "${KIPRJMOD}/3dmodels/SOIC8.step",
            offset: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotate: { x: 0, y: 0, z: 0 },
          },
        }}
      />
    </board>
  )

  const { footprintMetadataMap, symbolMetadataMap } =
    extractKicadMetadataForKicadProject(Board)

  expect(footprintMetadataMap.size).toBe(1)
  expect(symbolMetadataMap.size).toBe(0)

  const metadata = footprintMetadataMap.get("U")
  expect(metadata).toMatchInlineSnapshot(`
    {
      "footprintName": "SOIC8",
      "model": {
        "offset": {
          "x": 0,
          "y": 0,
          "z": 0,
        },
        "path": "\${KIPRJMOD}/3dmodels/SOIC8.step",
        "rotate": {
          "x": 0,
          "y": 0,
          "z": 0,
        },
        "scale": {
          "x": 1,
          "y": 1,
          "z": 1,
        },
      },
      "properties": {
        "Reference": {
          "at": {
            "x": 0,
            "y": -3,
          },
          "layer": "F.SilkS",
          "value": "U",
        },
        "Value": {
          "at": {
            "x": 0,
            "y": 3,
          },
          "layer": "F.Fab",
          "value": "ATmega328",
        },
      },
    }
  `)
})
