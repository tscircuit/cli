import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["GND"],
} as const

const RepeatedPadChip = (props: ChipProps<typeof pinLabels>) => (
  <chip
    {...props}
    pinLabels={pinLabels}
    pinAttributes={{ pin1: { requiresGround: true } }}
    manufacturerPartNumber="REPEATED-PAD-TEST"
    footprint={
      <footprint>
        <smtpad
          portHints={["pin1"]}
          pcbX={-0.6}
          pcbY={-3}
          width={1}
          height={1}
          shape="rect"
        />
        <smtpad
          portHints={["pin1"]}
          pcbX={0.6}
          pcbY={-3}
          width={1}
          height={1}
          shape="rect"
        />
        <courtyardoutline
          outline={[
            { x: -2, y: -4 },
            { x: 2, y: -4 },
            { x: 2, y: 4 },
            { x: -2, y: 4 },
            { x: -2, y: -4 },
          ]}
        />
      </footprint>
    }
  />
)

export default () => (
  <board width={12} height={12} routingDisabled>
    <RepeatedPadChip name="U1" pcbX={0} pcbY={0} />
    <resistor name="R1" resistance="1k" footprint="0402" pcbX={4} pcbY={-3} />
    <keepout
      name="KO1"
      shape="rect"
      pcbX={0}
      pcbY={1}
      width={4}
      height={3}
      layers={["top"]}
      excludeRefs={[".U1"]}
    />
    <trace name="GND" from=".U1 > .GND" to=".R1 > .pin1" thickness={0.2} />
    <trace name="GND_NET" from=".R1 > .pin1" to="net.GND" />
  </board>
)
