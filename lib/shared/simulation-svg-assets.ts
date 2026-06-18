import type {
  AnyCircuitElement,
  SimulationTransientVoltageGraph,
} from "circuit-json"
import {
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSimulationGraphSvg,
  isSimulationExperiment,
  isSimulationTransientVoltageGraph,
} from "circuit-to-svg"

const getSimulationSvgInputs = (circuitJson: AnyCircuitElement[]) => {
  const simulationExperiment = circuitJson.find(isSimulationExperiment)
  if (!simulationExperiment) return undefined

  const simulationTransientVoltageGraphIds = circuitJson
    .filter(
      (element): element is SimulationTransientVoltageGraph =>
        isSimulationTransientVoltageGraph(element) &&
        element.simulation_experiment_id ===
          simulationExperiment.simulation_experiment_id,
    )
    .map((element) => element.simulation_transient_voltage_graph_id)

  if (simulationTransientVoltageGraphIds.length === 0) return undefined

  return {
    simulation_experiment_id: simulationExperiment.simulation_experiment_id,
    simulation_transient_voltage_graph_ids: simulationTransientVoltageGraphIds,
  }
}

export const getSimulationSvgAssetsFromCircuitJson = (
  circuitJson: AnyCircuitElement[],
) => {
  const simulationSvgInputs = getSimulationSvgInputs(circuitJson)
  if (!simulationSvgInputs) return undefined

  return {
    simulationSvg: convertCircuitJsonToSimulationGraphSvg({
      circuitJson,
      ...simulationSvgInputs,
    }),
    schematicSimulationSvg: convertCircuitJsonToSchematicSimulationSvg({
      circuitJson,
      ...simulationSvgInputs,
    }),
  }
}
