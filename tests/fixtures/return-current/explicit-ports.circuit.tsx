import { simulation } from "@tscircuit/core"
import { Fragment } from "react"

export default () => (
  <board
    width={8}
    height={6}
    layers={2}
    thickness={0.8}
    schematicDisabled
    isViaInPadAllowed
  >
    <net name="GND" />
    {[-2, 2].map((x, index) => (
      <chip
        key={index}
        name={`U${index + 1}`}
        pcbX={x}
        pinLabels={{ pin1: index === 0 ? "OUT" : "IN", pin2: "GND" }}
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1"]}
              width={0.8}
              height={0.8}
              shape="rect"
            />
            <smtpad
              portHints={["pin2"]}
              pcbY={1.5}
              width={0.8}
              height={0.8}
              shape="rect"
            />
          </footprint>
        }
      />
    ))}
    <trace
      name="SIGNAL"
      from=".U1 > .OUT"
      to=".U2 > .IN"
      thickness={0.18}
      pcbPathRelativeTo=".U1 > .OUT"
      pcbPath={[
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ]}
    />
    <trace from=".U1 > .GND" to="net.GND" />
    <trace from=".U2 > .GND" to="net.GND" />
    {[-2, 2].map((x, index) => (
      <Fragment key={index}>
        <via
          name={`GV${index + 1}`}
          pcbX={x}
          pcbY={1.5}
          fromLayer="top"
          toLayer="bottom"
          holeDiameter={0.2}
          outerDiameter={0.6}
          connectsTo="net.GND"
        />
      </Fragment>
    ))}
    <copperpour
      layer="bottom"
      connectsTo="net.GND"
      boardEdgeMargin={0.2}
      padMargin={0}
      traceMargin={0}
    />
    <simulation.pcbreturncurrentsimulation name="Explicit GND return">
      <simulation.pcbreturncurrentexcitation
        source=".U1 > .OUT"
        load=".U2 > .IN"
        trace=".SIGNAL"
        ground="net.GND"
        current="5mA"
        returnSource=".U2 > .GND"
        returnSink=".U1 > .GND"
        sourceImpedance="25ohm"
        loadImpedance="100ohm"
      />
    </simulation.pcbreturncurrentsimulation>
  </board>
)
