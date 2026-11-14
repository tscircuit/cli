import { expect, test } from "bun:test"
import { createSimulationReport } from "lib/shared/run-simulation-report"
import {
  SIMULATION_ENGINE,
  type SimulationOutput,
} from "lib/eecircuit-engine/run-simulation"

const output: SimulationOutput = {
  result: {
    header: "transient",
    numVariables: 1,
    variableNames: ["v(out)"],
    numPoints: 1,
    dataType: "real",
    data: [{ name: "v(out)", type: "voltage", values: [1.23456789012345] }],
  },
  errors: [],
  info: "runtime log",
  engine: SIMULATION_ENGINE,
  spiceString: "* executed circuit\n.end",
}

test("recoverable warnings stay distinct from fatal simulation errors", () => {
  const warning = createSimulationReport({
    ...output,
    errors: ["Warning: singular matrix; gmin stepping succeeded"],
  })
  expect(warning.status).toBe("success")
  expect(warning.diagnostics.warnings).toHaveLength(1)
  const fatal = createSimulationReport({
    ...output,
    errors: ["run simulation(s) aborted"],
  })
  expect(fatal.status).toBe("failed")
  expect(fatal.diagnostics.errors).toHaveLength(1)
})

const invalidResults: SimulationOutput["result"][] = [
  null,
  { ...output.result!, numPoints: 0 },
  {
    ...output.result!,
    data: [{ name: "v(out)", type: "voltage", values: [Number.NaN] }],
  },
]
test.each(invalidResults)(
  "absent, empty or nonfinite waveforms cannot report success",
  (result) => {
    expect(createSimulationReport({ ...output, result }).status).toBe("failed")
  },
)
