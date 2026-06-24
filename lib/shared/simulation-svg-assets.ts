import type {
  AnyCircuitElement,
  SimulationTransientCurrentGraph,
  SimulationTransientVoltageGraph,
} from "circuit-json"
import {
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSimulationGraphSvg,
  isSimulationExperiment,
  isSimulationTransientVoltageGraph,
} from "circuit-to-svg"

const isSimulationTransientCurrentGraph = (
  element: AnyCircuitElement,
): element is SimulationTransientCurrentGraph =>
  element.type === "simulation_transient_current_graph"

const getSimulationSvgInputs = (circuitJson: AnyCircuitElement[]) => {
  const simulationExperiment = circuitJson.find(isSimulationExperiment)
  if (!simulationExperiment) return undefined

  const simulationTransientCurrentGraphIds = circuitJson
    .filter(
      (element): element is SimulationTransientCurrentGraph =>
        isSimulationTransientCurrentGraph(element) &&
        element.simulation_experiment_id ===
          simulationExperiment.simulation_experiment_id,
    )
    .map((element) => element.simulation_transient_current_graph_id)

  const simulationTransientVoltageGraphIds = circuitJson
    .filter(
      (element): element is SimulationTransientVoltageGraph =>
        isSimulationTransientVoltageGraph(element) &&
        element.simulation_experiment_id ===
          simulationExperiment.simulation_experiment_id,
    )
    .map((element) => element.simulation_transient_voltage_graph_id)

  if (
    simulationTransientCurrentGraphIds.length === 0 &&
    simulationTransientVoltageGraphIds.length === 0
  ) {
    return undefined
  }

  return {
    simulation_experiment_id: simulationExperiment.simulation_experiment_id,
    simulation_transient_current_graph_ids: simulationTransientCurrentGraphIds,
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
