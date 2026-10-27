import { expect, test } from "bun:test"
import { convertCircuitJsonToReadableNetlist } from "lib/shared/convert-circuit-json-to-readable-netlist"
import type { ReactElement } from "react"
import { RootCircuit } from "tscircuit"

const getComponentPinsSection = async (board: ReactElement) => {
  const circuit = new RootCircuit()
  circuit.add(board)
  await circuit.renderUntilSettled()
  const readableNetlist = convertCircuitJsonToReadableNetlist(
    circuit.getCircuitJson(),
  )
  return readableNetlist
    .slice(readableNetlist.indexOf("COMPONENT_PINS:"))
    .trim()
}

test("readable netlist keeps anode/cathode aliases only on polarized parts", async () => {
  const componentPins = await getComponentPinsSection(
    <board width="30mm" height="10mm" routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" pcbX={-10} />
      <inductor name="L1" inductance="10uH" footprint="0603" pcbX={-5} />
      <capacitor name="C1" capacitance="100nF" footprint="0402" pcbX={0} />
      <capacitor
        name="C2"
        capacitance="10uF"
        footprint="0805"
        polarized
        pcbX={5}
      />
      <diode name="D1" footprint="0603" pcbX={10} />
    </board>,
  )

  expect(componentPins).toMatchInlineSnapshot(`
    "COMPONENT_PINS:
    R1 (1kΩ res0402)
    - pin1(pos, left): NOT_CONNECTED
    - pin2(neg, right): NOT_CONNECTED

    L1
    - pin1(pos, left): NOT_CONNECTED
    - pin2(neg, right): NOT_CONNECTED

    C1 (100nF cap0402)
    - pin1(pos, left): NOT_CONNECTED
    - pin2(neg, right): NOT_CONNECTED

    C2 (10uF cap0805)
    - pin1(pos, anode, left): NOT_CONNECTED
    - pin2(neg, cathode, right): NOT_CONNECTED

    D1
    - pin1(pos, anode, left): NOT_CONNECTED
    - pin2(neg, cathode, right): NOT_CONNECTED"
  `)
})

test("readable netlist omits the footprint of parts without a footprinter string", async () => {
  const componentPins = await getComponentPinsSection(
    <board width="20mm" height="10mm" routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" pcbX={-5} />
      <resistor
        name="R2"
        resistance="10k"
        pcbX={5}
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1"]}
              pcbX={-0.8}
              pcbY={0}
              width={0.8}
              height={0.9}
              shape="rect"
            />
            <smtpad
              portHints={["pin2"]}
              pcbX={0.8}
              pcbY={0}
              width={0.8}
              height={0.9}
              shape="rect"
            />
          </footprint>
        }
      />
    </board>,
  )

  expect(componentPins).not.toContain("undefined")
  expect(componentPins.split("\n")).toContain("R1 (1kΩ res0402)")
  expect(componentPins.split("\n")).toContain("R2 (10kΩ)")
})
