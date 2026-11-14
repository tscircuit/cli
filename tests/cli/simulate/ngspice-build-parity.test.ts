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

test("reproduces different CLI and build handling of the same PSpice model", async () => {
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
  expect({
    buildOutputVolts: graph.voltage_levels.at(-1),
    cliDiagnostics: simulated.errors.filter((line) => line.trim()),
    cliVariableNames: simulated.result?.variableNames,
  }).toMatchInlineSnapshot(`
    {
      "buildOutputVolts": 2.5,
      "cliDiagnostics": [
        "Error on line 3 or its substitute:",
        "  r1 in out 1k tc=0,0",
        "  unknown parameter (0) ",
        "    Simulation interrupted due to error!",
        "Error: circuit not parsed.",
      ],
      "cliVariableNames": [],
    }
  `)
}, 30000)
