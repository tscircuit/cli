import type { SimulationOutput } from "lib/eecircuit-engine/run-simulation"
import type { AnyCircuitElement } from "circuit-json"

export interface SimulationVisualizationData {
  circuitJson: AnyCircuitElement[]
  simulation_experiment_id: string
  simulation_transient_voltage_graph_ids: string[]
  timepoints: number[]
}

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Converts eecircuit-engine simulation results into circuit JSON with simulation elements
 * suitable for visualization with convertCircuitJsonToSchematicSimulationSvg
 */
export async function embedSimulationInCircuitJson(
  circuitJson: AnyCircuitElement[],
  simulationOutput: SimulationOutput,
): Promise<SimulationVisualizationData> {
  if (!simulationOutput.result) {
    throw new Error(
      "Simulation produced no results. Check circuit configuration.",
    )
  }

  const result = simulationOutput.result

  // Generate unique experiment ID for this simulation
  const experimentId = `exp_${generateId()}`

  // Extract timepoints
  const timepoints: number[] = []
  if (result.numPoints) {
    for (let i = 0; i < result.numPoints; i++) {
      timepoints.push(i)
    }
  }

  // Calculate time parameters based on simulation duration
  const startTimeMs = 0
  const endTimeMs = result.numPoints ? result.numPoints * 1 : 1000
  const timePerStep = result.numPoints ? endTimeMs / result.numPoints : 1

  // Extract voltage probes from simulation result
  const voltageGraphIds: string[] = []
  const voltageGraphElements: AnyCircuitElement[] = []

  // Look for voltage probes in variableNames
  if (result.variableNames && result.data) {
    for (let i = 0; i < result.variableNames.length; i++) {
      const varName = result.variableNames[i]
      const varData = result.data[i]

      if (
        typeof varName === "string" &&
        varName.toLowerCase().startsWith("v(")
      ) {
        const graphId = `graph_${generateId()}`
        voltageGraphIds.push(graphId)

        // Extract node name from v(node_name)
        const nodeMatch = varName.match(/v\((.*?)\)/i)
        const nodeName = nodeMatch ? nodeMatch[1] : varName

        // Extract values from the variable data
        let voltages: number[] = []
        if (varData && "values" in varData) {
          voltages = (varData.values as any[]).map((v) => {
            if (typeof v === "number") return v
            if (typeof v === "object" && "real" in v) return (v as any).real
            const num = parseFloat(String(v))
            return isNaN(num) ? 0 : num
          })
        }

        // Create a simulation_transient_voltage_graph element
        const graphElement: AnyCircuitElement = {
          type: "simulation_transient_voltage_graph",
          simulation_transient_voltage_graph_id: graphId,
          simulation_experiment_id: experimentId,
          voltage_levels: voltages,
          timestamps_ms: Array.from({ length: voltages.length }, (_, i) =>
            Math.round((i / Math.max(1, voltages.length - 1)) * endTimeMs),
          ),
          time_per_step: timePerStep,
          start_time_ms: startTimeMs,
          end_time_ms: endTimeMs,
          name: `Voltage at ${nodeName}`,
        } as AnyCircuitElement

        voltageGraphElements.push(graphElement)
      }
    }
  }

  // Create simulation experiment element
  const experimentElement: AnyCircuitElement = {
    type: "simulation_experiment",
    simulation_experiment_id: experimentId,
    name: "SPICE Transient Analysis",
    experiment_type: "spice_transient_analysis",
    time_per_step: timePerStep,
    start_time_ms: startTimeMs,
    end_time_ms: endTimeMs,
  } as AnyCircuitElement

  // Combine all elements: original circuit + simulation elements
  const enhancedCircuitJson: AnyCircuitElement[] = [
    ...circuitJson,
    experimentElement,
    ...voltageGraphElements,
  ]

  return {
    circuitJson: enhancedCircuitJson,
    simulation_experiment_id: experimentId,
    simulation_transient_voltage_graph_ids: voltageGraphIds,
    timepoints,
  }
}

/**
 * Validates that simulation results contain necessary data for visualization
 */
export function validateSimulationResults(result: any): {
  valid: boolean
  message: string
} {
  if (!result || typeof result !== "object") {
    return {
      valid: false,
      message: "Invalid simulation result format",
    }
  }

  // Check for the structure from eecircuit-engine
  if (!result.variableNames || !Array.isArray(result.variableNames)) {
    return {
      valid: false,
      message: "No variable names in simulation results",
    }
  }

  if (result.numPoints === undefined || result.numPoints === 0) {
    return {
      valid: false,
      message: "No data points in simulation results",
    }
  }

  const hasVoltageProbes = result.variableNames.some(
    (name: string) =>
      typeof name === "string" && name.toLowerCase().startsWith("v("),
  )

  if (!hasVoltageProbes) {
    return {
      valid: false,
      message: "No voltage probes in simulation results",
    }
  }

  return {
    valid: true,
    message: "Simulation results valid for visualization",
  }
}
