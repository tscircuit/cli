import type { ReactNode } from "react"

// TI SN74LVC1G04, SC70-5 (DCK), 3.3 V models. See README.md for the vendor file.
const Inverter = ({ name, x, y }: { name: string; x: number; y: number }) => (
  <>
    <chip
      name={name}
      manufacturerPartNumber="SN74LVC1G04DCK"
      footprint="sot23_5"
      pcbX={x}
      pcbY={y}
      pinLabels={{ pin1: "NC", pin2: "A", pin3: "GND", pin4: "Y", pin5: "VCC" }}
    />
    <ibismodel
      componentRef={`.${name}`}
      ibisModelAsset={{
        url: "./models/sn74lvc1g04.ibs",
        project_relative_path: "models/sn74lvc1g04.ibs",
        mimetype: "text/plain",
      }}
      ibisComponentName="LVC1G04_DCK"
      ibisPinNameToPortLabel={{ "2": "A", "3": "GND", "4": "Y", "5": "VCC" }}
      ibisPinNameToModelName={{ "2": "LVC1G04_IN_33", "4": "LVC1G04_OUT_33" }}
      ibisPinNameToReferencePortLabels={{
        "2": {
          pullup: "VCC",
          pulldown: "GND",
          powerClamp: "VCC",
          groundClamp: "GND",
        },
        "4": {
          pullup: "VCC",
          pulldown: "GND",
          powerClamp: "VCC",
          groundClamp: "GND",
        },
      }}
    />
    <trace from={`.${name} > .GND`} to="net.GND" />
    <trace from={`.${name} > .VCC`} to="net.VCC" />
  </>
)

export const SignalIntegrityBoard = ({
  children,
  clock = false,
}: { children: ReactNode; clock?: boolean }) => (
  <board
    width="40mm"
    height="20mm"
    fabricatorPreset="jlcpcb_standard"
    routingDisabled
    schematicDisabled
  >
    <Inverter name="TX" x={-12} y={0} />
    <Inverter name="RX" x={12} y={0} />
    <trace from=".TX > .Y" to=".RX > .A" />
    {clock && (
      <>
        <Inverter name="CLK_TX" x={-12} y={5} />
        <Inverter name="CLK_RX" x={12} y={5} />
        <trace from=".CLK_TX > .Y" to=".CLK_RX > .A" />
      </>
    )}
    {children}
  </board>
)

export default () => (
  <SignalIntegrityBoard>
    <signalintegrity
      bitRate="20Mbps"
      unrouted="ideal"
      pdn="ideal"
      supply="ibis"
    >
      <signal name="DATA" driver=".TX > .Y" receiver=".RX > .A" />
    </signalintegrity>
  </SignalIntegrityBoard>
)
