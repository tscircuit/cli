import { test, expect } from "bun:test"
import { extractKicadMetadataForKicadProject } from "lib/shared/extract-kicad-metadata-for-kicad-project"

test("extracts metadata from nested functional components", () => {
  // Inner component that defines metadata
  const CustomSensor = (props: { name: string }) => (
    <chip
      name={props.name}
      kicadFootprintMetadata={{
        footprintName: "LGA14",
        properties: {
          Reference: { value: "U" },
          Value: { value: "BME280" },
          Description: { value: "Environmental sensor" },
        },
        attributes: {
          smd: true,
          exclude_from_bom: false,
        },
      }}
      kicadSymbolMetadata={{
        symbolName: "BME280",
        properties: {
          Reference: { value: "U" },
          Value: { value: "BME280" },
        },
      }}
    />
  )

  // Wrapper component
  const SensorModule = () => (
    <group>
      <CustomSensor name="U1" />
      <resistor name="R1" resistance="10k" />
    </group>
  )

  // Top-level board
  const Board = () => (
    <board>
      <SensorModule />
    </board>
  )

  const { footprintMetadataMap, symbolMetadataMap } =
    extractKicadMetadataForKicadProject(Board)

  // Should find the metadata from deeply nested CustomSensor
  expect(footprintMetadataMap.size).toBe(1)
  expect(symbolMetadataMap.size).toBe(1)

  expect(footprintMetadataMap.get("U")).toMatchInlineSnapshot(`
    {
      "attributes": {
        "exclude_from_bom": false,
        "smd": true,
      },
      "footprintName": "LGA14",
      "properties": {
        "Description": {
          "value": "Environmental sensor",
        },
        "Reference": {
          "value": "U",
        },
        "Value": {
          "value": "BME280",
        },
      },
    }
  `)

  expect(symbolMetadataMap.get("U")).toMatchInlineSnapshot(`
    {
      "properties": {
        "Reference": {
          "value": "U",
        },
        "Value": {
          "value": "BME280",
        },
      },
      "symbolName": "BME280",
    }
  `)
})
