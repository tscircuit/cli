import manualEdits from "./manual-edits.json"

export default () => {
  return (
    <board width="12mm" height="30mm" manualEdits={manualEdits}>
      <pinheader
        name="J1"
        pinCount={2}
        pinLabels={["VBUS", "GND"]}
        pcbY={-10}
      />
      <resistor name="R1" footprint="0603" resistance="1k" pcbY={-4} />
      <led name="LED" footprint="0603" neg="net.GND" pcbY={4} />
      <trace name="power_to_resistor" from=".J1 > .VBUS" to=".R1 > .pos" />
      <trace name="resistor_to_led" from=".R1 > .neg" to=".LED > .pos" />
      <trace name="led_to_ground" from=".LED > .neg" to=".J1 > .GND" />
      <trace name="header_ground_net" from=".J1 > .GND" to="net.GND" />
    </board>
  )
}
