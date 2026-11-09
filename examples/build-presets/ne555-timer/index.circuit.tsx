import { z } from "zod"

export const propsSchema = z.object({
  timingCapacitance: z.enum(["10uF", "100uF"]).default("10uF"),
  omitLed: z.boolean().default(false),
})

export const presets = {
  full_board: {},
  slow: { timingCapacitance: "100uF" },
  without_led: { omitLed: true },
}

export default function Ne555Timer(input: z.input<typeof propsSchema> = {}) {
  const props = propsSchema.parse(input)
  return (
    <board width="40mm" height="26mm">
      <chip
        name="U1"
        manufacturerPartNumber="NE555DR"
        footprint="soic8"
        pinLabels={{
          pin1: "GND",
          pin2: "TRIG",
          pin3: "OUT",
          pin4: "RESET",
          pin5: "CTRL",
          pin6: "THRESH",
          pin7: "DISCH",
          pin8: "VCC",
        }}
        schPinArrangement={{
          leftSide: ["RESET", "TRIG", "THRESH"],
          rightSide: ["OUT", "DISCH", "CTRL"],
          topSide: ["VCC"],
          bottomSide: ["GND"],
        }}
        pcbX={0}
        pcbY={0}
        schX={0}
        schY={0}
      />
      <pinheader
        name="J1"
        pinCount={2}
        pcbX={-15}
        pcbY={0}
        schX={-8}
        schY={3}
      />
      <resistor
        name="R1"
        resistance="10k"
        footprint="0805"
        pcbX={-7}
        pcbY={7}
        schX={3}
        schY={3}
      />
      <resistor
        name="R2"
        resistance="68k"
        footprint="0805"
        pcbX={0}
        pcbY={7}
        schX={3}
        schY={0}
      />
      <capacitor
        name="C1"
        capacitance={props.timingCapacitance}
        footprint="0805"
        pcbX={7}
        pcbY={7}
        schX={3}
        schY={-3}
      />
      <capacitor
        name="C2"
        capacitance="10nF"
        footprint="0805"
        pcbX={7}
        pcbY={0}
        schX={5}
        schY={-3}
      />
      <capacitor
        name="C3"
        capacitance="100nF"
        footprint="0805"
        pcbX={0}
        pcbY={-7}
        schX={-5}
        schY={0}
      />
      {!props.omitLed && (
        <>
          <resistor
            name="R3"
            resistance="1k"
            footprint="0805"
            pcbX={10}
            pcbY={-7}
            schX={7}
            schY={1}
          />
          <led
            name="D1"
            color="red"
            footprint="0805"
            pinLabels={{ pin1: "cathode", pin2: "anode" }}
            pcbX={15}
            pcbY={-7}
            schX={7}
            schY={-2}
          />
          <trace from=".U1 > .OUT" to=".R3 > .pin1" />
          <trace from=".R3 > .pin2" to=".D1 > .anode" />
          <trace from=".D1 > .cathode" to="net.GND" />
        </>
      )}
      <net name="VCC" />
      <net name="GND" />
      <trace from=".J1 > .pin1" to="net.VCC" />
      <trace from=".J1 > .pin2" to="net.GND" />
      <trace from=".U1 > .VCC" to="net.VCC" />
      <trace from=".U1 > .RESET" to="net.VCC" />
      <trace from=".U1 > .GND" to="net.GND" />
      <trace from=".R1 > .pin1" to="net.VCC" />
      <trace from=".R1 > .pin2" to=".U1 > .DISCH" />
      <trace from=".R2 > .pin1" to=".U1 > .DISCH" />
      <trace from=".R2 > .pin2" to=".U1 > .THRESH" />
      <trace from=".U1 > .THRESH" to=".U1 > .TRIG" />
      <trace from=".C1 > .pin1" to=".U1 > .THRESH" />
      <trace from=".C1 > .pin2" to="net.GND" />
      <trace from=".C2 > .pin1" to=".U1 > .CTRL" />
      <trace from=".C2 > .pin2" to="net.GND" />
      <trace from=".C3 > .pin1" to="net.VCC" />
      <trace from=".C3 > .pin2" to="net.GND" />
      <schematictext text="NE555 astable timer, 5 V supply" schX={0} schY={5} />
    </board>
  )
}
