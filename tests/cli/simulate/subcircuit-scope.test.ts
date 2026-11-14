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

test("automatic probes and initial conditions stay outside chip subcircuits", () => {
  const netlist = getSpiceWithPaddedSim(circuitJson)
  const probe = netlist.split("\n").find((line) => /^\.probe\b/i.test(line))

  expect(probe).toBe(".probe V(N1)")
  expect(netlist).toContain(".ic V(N1)=0")
  expect(netlist).not.toMatch(/^\.ic V\((SAMPLE|GND|BIAS|HIDDEN|B)\)/m)
  expect(netlist).toContain("Csample SAMPLE GND 26p")
})

test("subcircuit-local initial conditions do not suppress top-level defaults", () => {
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
  expect(getSpiceWithPaddedSim(withLocalIc)).toContain(".ic V(N1)=0")
})
