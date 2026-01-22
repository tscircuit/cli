import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("KeyHotSocket pattern from transcript - nested KeySocket", () => {
  const KeySocket = () => (
    <chip
      name="REF**"
      kicadFootprintMetadata={{
        properties: {
          Reference: { value: "SW**" },
          Value: { value: "MX_SWITCH" },
          Datasheet: { value: "https://example.com/switch-datasheet.pdf" },
          Description: { value: "Cherry MX mechanical key switch" },
        },
      }}
      footprint={
        <footprint>
          <smtpad
            shape="rect"
            width="2.5mm"
            height="1.2mm"
            portHints={["pin1"]}
            pcbX={-3.81}
            pcbY={2.54}
          />
          <smtpad
            shape="rect"
            width="2.5mm"
            height="1.2mm"
            portHints={["pin2"]}
            pcbX={2.54}
            pcbY={5.08}
          />
          <hole pcbX={0} pcbY={0} diameter="4mm" />
          <silkscreentext text="SW" pcbY={8} fontSize="1mm" />
        </footprint>
      }
      cadModel={{
        stlUrl: "/path/to/CherryMxSwitch.step",
        rotationOffset: { x: 0, y: 0, z: 0 },
      }}
      pinLabels={{ pin1: "1", pin2: "2" }}
    />
  )

  const KeyHotSocket = () => (
    <board width="20mm" height="20mm">
      <KeySocket />
    </board>
  )

  const metadata = extractKicadFootprintMetadata(KeyHotSocket)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "SW**" },
      Value: { value: "MX_SWITCH" },
      Datasheet: { value: "https://example.com/switch-datasheet.pdf" },
      Description: { value: "Cherry MX mechanical key switch" },
    },
  })
})
