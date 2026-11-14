import { expect, test } from "bun:test"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { createNgspiceSpiceEngine } from "@tscircuit/ngspice-spice-engine"

// A TI/PSpice-style resistor coefficient pair. The build adapter normalizes
// this syntax and selects PSpice compatibility; the separate CLI engine did not.
const spiceString = `* CLI/build compatibility reproduction
V1 in 0 DC 5
R1 in out 1k TC=0,0
R2 out 0 1k
.probe V(out)
.tran 1u 2u
.END`

test("CLI simulation accepts the same PSpice model syntax as the build adapter", async () => {
  const engine = await createNgspiceSpiceEngine()
  const built = await engine.simulate(spiceString)
  const graph = built.simulationResultCircuitJson.find(
    (record) =>
      record.type === "simulation_transient_voltage_graph" &&
      record.name === "out",
  )
  expect(graph?.type).toBe("simulation_transient_voltage_graph")
  if (graph?.type !== "simulation_transient_voltage_graph")
    throw new Error("Build produced no voltage trace")
  expect(graph.voltage_levels.at(-1)).toBeCloseTo(2.5, 8)

  const simulated = await runSimulation(spiceString)
  expect(simulated.errors.filter((line) => /^Error|Fatal/i.test(line))).toEqual(
    [],
  )
  const voltage = simulated.result?.data.find(
    (series) => series.name === "v(out)",
  )
  expect(voltage?.values.at(-1)).toBeCloseTo(2.5, 8)
  expect({
    engine: simulated.engine,
    outputVolts: voltage?.values.at(-1),
    resistor: simulated.spiceString
      .split("\n")
      .find((line) => /^R1\b/.test(line)),
    diagnostics: simulated.errors,
  }).toMatchInlineSnapshot(`
    {
      "diagnostics": [],
      "engine": {
        "compatibility": "psa",
        "name": "ngspice",
        "package": "@tscircuit/eecircuit-engine",
        "version": "1.7.6",
      },
      "outputVolts": 2.5,
      "resistor": "R1 in out 1k TC1=0 TC2=0",
    }
  `)
}, 30000)
