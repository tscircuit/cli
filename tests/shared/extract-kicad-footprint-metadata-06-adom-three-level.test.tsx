import { test, expect } from "bun:test"
import { extractKicadFootprintMetadata } from "lib/shared/extract-kicad-footprint-metadata"

test("adom pattern: three-level component hierarchy with type discriminator", () => {
  // Simulating: MachinePinContactBuilder (contains metadata)
  const MachinePinOrContact = (props: {
    pinOrContactType?: string
    name?: string
  }) => (
    <chip
      name={props?.name ?? "M1"}
      kicadFootprintMetadata={{
        properties: {
          Reference: { value: "M**" },
          Value: { value: "MachinePin" },
          Description: { value: "Machine Pin or Contact" },
        },
      }}
      footprint={
        <footprint>
          <platedhole shape="circle" holeDiameter="0.5mm" outerDiameter="1mm" />
        </footprint>
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

  const metadata = extractKicadFootprintMetadata(MachinePinMediumShort)

  expect(metadata).toEqual({
    properties: {
      Reference: { value: "M**" },
      Value: { value: "MachinePin" },
      Description: { value: "Machine Pin or Contact" },
    },
  })
})
