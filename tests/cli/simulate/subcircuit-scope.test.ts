import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getSpiceWithPaddedSim } from "lib/shared/get-spice-with-sim"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "cap",
    name: "C1",
    ftype: "simple_capacitor",
    capacitance: 1e-9,
  },
  ...[1, 2].map(
    (pin_number): AnyCircuitElement => ({
      type: "source_port",
      source_port_id: `cap${pin_number}`,
      source_component_id: "cap",
      name: pin_number === 2 ? "GND" : "pin1",
      pin_number,
    }),
  ),
  {
    type: "source_net",
    source_net_id: "ground",
    name: "GND",
    member_source_group_ids: [],
  },
  {
    type: "source_trace",
    source_trace_id: "ground_connection",
    connected_source_port_ids: ["cap2"],
    connected_source_net_ids: ["ground"],
  },
  {
    type: "simulation_spice_subcircuit",
    simulation_spice_subcircuit_id: "adc",
    source_component_id: "adc",
    spice_pin_to_source_port_map: { VIN: "cap1", GND: "cap2" },
    subcircuit_source: `.SUBCKT ADC_TRACK VIN GND
Rtrack VIN SAMPLE 500
Csample SAMPLE GND 26p
Vbias BIAS GND DC 1
.SUBCKT NESTED A B
Cnested HIDDEN B 1p
.ENDS NESTED
.ENDS ADC_TRACK`,
  },
]

// Repro snapshots intentionally record the broken main-branch output. The
// paired fix PR asserts the corrected behavior instead.
test("reproduces automatic directives leaking chip-local nodes", () => {
  const netlist = getSpiceWithPaddedSim(circuitJson)
  expect(
    netlist.split("\n").filter((line) => /^\.(probe|ic)\b/i.test(line)),
  ).toMatchInlineSnapshot(`
    [
      ".ic V(SAMPLE)=0",
      ".ic V(GND)=0",
      ".ic V(HIDDEN)=0",
      ".ic V(B)=0",
      ".ic V(N1)=0",
      ".probe V(VIN) V(SAMPLE) V(GND) V(BIAS) V(HIDDEN) V(B) V(N1) I(Vbias)",
    ]
  `)
})

test("reproduces a local initial condition suppressing top-level defaults", () => {
  const withLocalIc = circuitJson.map((record) =>
    record.type === "simulation_spice_subcircuit"
      ? {
          ...record,
          subcircuit_source: record.subcircuit_source.replace(
            "Rtrack",
            ".ic V(SAMPLE)=0\nRtrack",
          ),
        }
      : record,
  )
  expect(
    getSpiceWithPaddedSim(withLocalIc)
      .split("\n")
      .filter((line) => /^\.ic\b/i.test(line)),
  ).toMatchInlineSnapshot(`
    [
      ".ic V(SAMPLE)=0",
    ]
  `)
})
