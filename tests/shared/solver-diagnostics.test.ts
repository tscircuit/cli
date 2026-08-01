import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { SolverDiagnostics } from "lib/shared/solver-diagnostics"

test("solver diagnostics records full constructor inputs in event order", () => {
  const debugDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tsci-solver-diagnostics-"),
  )
  const outputPath = path.join(debugDir, "solver-inputs.json")
  const rootCircuit = new EventEmitter()
  const diagnostics = new SolverDiagnostics({
    enabled: true,
    outputPath,
    entrypoint: "sample.circuit.tsx",
  })
  const sharedInput = { connection_count: 2 }
  const circularInput: { self?: unknown } = {}
  circularInput.self = circularInput

  diagnostics.attachToRootCircuit(rootCircuit)
  rootCircuit.emit("solver:started", {
    solverName: "SchematicTracePipelineSolver",
    componentName: "<board# />",
    solverParams: { legacy_input: true },
    solverConstructorArgs: [
      {
        net_ids: new Set(["GND", "LOGIC_3V3"]),
        optional_value: undefined,
        invalid_number: Number.NaN,
        shared_input_a: sharedInput,
        shared_input_b: sharedInput,
        circular_input: circularInput,
      },
      { hideRatsNet: false },
    ],
  })
  rootCircuit.emit("solver:started", {
    solverName: "LegacySolver",
    componentName: "<group# />",
    solverParams: { input_problem: { connections: 2 } },
  })
  diagnostics.finalize()

  const artifact = JSON.parse(fs.readFileSync(outputPath, "utf8"))
  expect(artifact).toEqual({
    format: "tscircuit_solver_debug_v1",
    entrypoint: "sample.circuit.tsx",
    solvers: [
      {
        sequence: 0,
        solver_name: "SchematicTracePipelineSolver",
        component_name: "<board# />",
        constructor_args: [
          {
            net_ids: {
              value_type: "set",
              values: ["GND", "LOGIC_3V3"],
            },
            optional_value: { value_type: "undefined" },
            invalid_number: { value_type: "number", value: "NaN" },
            shared_input_a: { connection_count: 2 },
            shared_input_b: { connection_count: 2 },
            circular_input: {
              self: {
                value_type: "circular_reference",
                path: "#/0/circular_input",
              },
            },
          },
          { hideRatsNet: false },
        ],
      },
      {
        sequence: 1,
        solver_name: "LegacySolver",
        component_name: "<group# />",
        constructor_args: [{ input_problem: { connections: 2 } }],
      },
    ],
  })
})
