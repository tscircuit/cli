import { createHash } from "node:crypto"
import { isFatalSimulationDiagnostic } from "lib/eecircuit-engine/is-fatal-simulation-diagnostic"
import {
  runSimulation,
  SIMULATION_ENGINE,
  type SimulationOutput,
} from "lib/eecircuit-engine/run-simulation"

export function createSimulationReport(output: SimulationOutput) {
  const diagnostics = output.errors.filter((line) => line.trim())
  const errors = diagnostics.filter(isFatalSimulationDiagnostic)
  const warnings = diagnostics.filter(
    (line) => !isFatalSimulationDiagnostic(line),
  )
  const { result } = output
  const hasSamples =
    result &&
    result.numPoints > 0 &&
    result.numVariables > 0 &&
    result.data.length === result.variableNames.length &&
    result.data.length > 0 &&
    result.data.every(
      (series) =>
        series.values.length === result.numPoints &&
        series.values.every((sample) =>
          typeof sample === "number"
            ? Number.isFinite(sample)
            : Number.isFinite(sample.real) && Number.isFinite(sample.img),
        ),
    )
  if (!hasSamples) errors.push("Simulation produced no usable finite samples")

  return {
    status: errors.length > 0 ? "failed" : "success",
    engine: output.engine,
    netlist: output.spiceString,
    netlist_sha256: createHash("sha256")
      .update(output.spiceString)
      .digest("hex"),
    result,
    diagnostics: { errors, warnings, log: output.info },
  }
}

export async function runSimulationReport(spiceString: string) {
  try {
    return createSimulationReport(await runSimulation(spiceString))
  } catch (error) {
    return createSimulationReport({
      result: null,
      info: "",
      errors: [
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      ],
      engine: SIMULATION_ENGINE,
      spiceString,
    })
  }
}
