import { test, expect } from "bun:test"
import { extractKicadSymbolMetadata } from "lib/shared/extract-kicad-symbol-metadata"

test("three-level component hierarchy with type discriminator", () => {
  // Simulating: MachinePinContactBuilder (contains metadata)
  const MachinePinOrContact = (props: {
    pinOrContactType?: string
    name?: string
  }) => (
    <chip
      name={props?.name ?? "M1"}
      kicadSymbolMetadata={{
        pinNumbers: {
          hide: true,
        },
        pinNames: {
          hide: true,
          offset: 2.54,
        },
        properties: {
          Reference: {
            value: "SW",
          },
          Value: {
            value: "MX_SWITCH",
          },
          Description: {
            value: "Cherry MX switch symbol",
          },
        },
      }}
      symbol={
        <symbol>
          <schematiccircle radius="1mm" center={{ x: 0, y: 0 }} />
        </symbol>
      }
    />
  )

  // Simulating: MachinePin (base component)
  const MachinePin = (props: { type?: string; name?: string }) => {
    const { type = "MachinePinMediumStandard", name = "M1" } = props ?? {}
    return <MachinePinOrContact pinOrContactType={type} name={name} />
  }

  // Simulating: MachinePinMediumShort (generated wrapper)
  const MachinePinMediumShort = (props: { name?: string }) => (
    <MachinePin type="MachinePinMediumShort" {...(props ?? {})} />
  )

  const metadata = extractKicadSymbolMetadata(MachinePinMediumShort)

  expect(metadata).toMatchInlineSnapshot(`
    {
      "pinNames": {
        "hide": true,
        "offset": 2.54,
      },
      "pinNumbers": {
        "hide": true,
      },
      "properties": {
        "Description": {
          "value": "Cherry MX switch symbol",
        },
        "Reference": {
          "value": "SW",
        },
        "Value": {
          "value": "MX_SWITCH",
        },
      },
    }
  `)
})
