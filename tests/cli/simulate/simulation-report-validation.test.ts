import { expect, test } from "bun:test"
import { createSimulationReport } from "lib/shared/run-simulation-report"
import {
  SIMULATION_ENGINE,
  type SimulationOutput,
} from "lib/eecircuit-engine/run-simulation"
import type { ResultType } from "lib/types/eecircuit-engine"

const realResult: Extract<ResultType, { dataType: "real" }> = {
  header: "transient",
  numVariables: 1,
  variableNames: ["v(out)"],
  numPoints: 1,
  dataType: "real",
  data: [{ name: "v(out)", type: "voltage", values: [1.23456789012345] }],
}
const output: SimulationOutput = {
  result: realResult,
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
  expect(warning.diagnostics).toMatchInlineSnapshot(`
    {
      "errors": [],
      "log": "runtime log",
      "warnings": [
        "Warning: singular matrix; gmin stepping succeeded",
      ],
    }
  `)
  expect(warning.diagnostics.warnings).toHaveLength(1)
  const fatal = createSimulationReport({
    ...output,
    errors: ["run simulation(s) aborted"],
  })
  expect(fatal.status).toBe("failed")
  expect(fatal.diagnostics).toMatchInlineSnapshot(`
    {
      "errors": [
        "run simulation(s) aborted",
      ],
      "log": "runtime log",
      "warnings": [],
    }
  `)
  expect(fatal.diagnostics.errors).toHaveLength(1)
})

const invalidResults: SimulationOutput["result"][] = [
  null,
  { ...realResult, numPoints: 0 },
  {
    ...realResult,
    data: [{ name: "v(out)", type: "voltage", values: [Number.NaN] }],
  },
]
test.each(invalidResults)(
  "absent, empty or nonfinite waveforms cannot report success",
  (result) => {
    const report = createSimulationReport({ ...output, result })
    expect(report.status).toBe("failed")
    expect(report.diagnostics).toMatchInlineSnapshot(`
      {
        "errors": [
          "Simulation produced no usable finite samples",
        ],
        "log": "runtime log",
        "warnings": [],
      }
    `)
  },
)
