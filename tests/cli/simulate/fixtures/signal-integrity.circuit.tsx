import { signalintegrity } from "@tscircuit/core"
import type { ReactNode } from "react"

// TI SN74LVC1G04, SOT23-5 (DBV), 3.3 V models. See README.md for the vendor file.
const Inverter = ({ name, x, y }: { name: string; x: number; y: number }) => (
  <>
    <chip
      name={name}
      manufacturerPartNumber="SN74LVC1G04DBV"
      footprint="sot23_5"
      pcbX={x}
      pcbY={y}
      pinLabels={{ pin1: "NC", pin2: "A", pin3: "GND", pin4: "Y", pin5: "VCC" }}
    />
    <signalintegrity.ibismodel
      componentRef={`.${name}`}
      ibisModelAsset={{
        url: "./models/sn74lvc1g04.ibs",
        project_relative_path: "models/sn74lvc1g04.ibs",
        mimetype: "text/plain",
      }}
      ibisComponentName="LVC1G04_DBV"
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

// The D and /RE inputs receive data and strobe on the same physical chip.
const ClockReceiver = () => (
  <>
    <chip
      name="RX"
      manufacturerPartNumber="SN65HVD72D"
      footprint="soic8"
      pcbX={12}
      pinLabels={{
        pin1: "R",
        pin2: "CLK",
        pin3: "DE",
        pin4: "A",
        pin5: "GND",
        pin6: "P",
        pin7: "N",
        pin8: "VCC",
      }}
    />
    <signalintegrity.ibismodel
      componentRef=".RX"
      ibisModelAsset={{
        url: "./models/sn65hvd72.ibs",
        project_relative_path: "models/sn65hvd72.ibs",
        mimetype: "text/plain",
      }}
      ibisComponentName="SN65HVD72D"
      ibisPinNameToPortLabel={{
        "1": "R",
        "2": "CLK",
        "3": "DE",
        "4": "A",
        "5": "GND",
        "6": "P",
        "7": "N",
        "8": "VCC",
      }}
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
    <trace from=".RX > .GND" to="net.GND" />
    <trace from=".RX > .VCC" to="net.VCC" />
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
    {clock ? <ClockReceiver /> : <Inverter name="RX" x={12} y={0} />}
    <trace from=".TX > .Y" to=".RX > .A" />
    {clock && (
      <>
        <Inverter name="CLK_TX" x={-12} y={5} />
        <Inverter name="RX2" x={12} y={5} />
        <trace from=".CLK_TX > .Y" to=".RX > .CLK" />
        <trace from=".TX > .Y" to=".RX2 > .A" />
      </>
    )}
    {children}
  </board>
)

export default () => (
  <SignalIntegrityBoard>
    <signalintegrity.simulation bitRate="20Mbps" unrouted="ideal" pdn="ideal">
      <signalintegrity.signal
        name="DATA"
        driverRef=".TX > .Y"
        receiverRef=".RX > .A"
      />
    </signalintegrity.simulation>
  </SignalIntegrityBoard>
)
