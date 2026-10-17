export default () => (
  <board width="20mm" height="10mm" routingDisabled>
    <net name="VDD" isPowerNet />
    <net name="GND" isGroundNet />
    <capacitor
      name="C1"
      capacitance="100nF"
      footprint="0402"
      schX={-3}
      pcbX={-3}
      connections={{ pin1: "net.VDD", pin2: "net.GND" }}
    />
    <capacitor
      name="C2"
      capacitance="100nF"
      footprint="0402"
      schX={3}
      pcbX={3}
      connections={{ pin1: "net.VDD", pin2: "net.GND" }}
    />
  </board>
)
