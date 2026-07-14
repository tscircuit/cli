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

const getSimulationSvgInputs = (
  circuitJson: AnyCircuitElement[],
  simulationExperimentId: string,
) => {
  const simulationTransientCurrentGraphIds = circuitJson
    .filter(
      (element): element is SimulationTransientCurrentGraph =>
        isSimulationTransientCurrentGraph(element) &&
        element.simulation_experiment_id === simulationExperimentId,
    )
    .map((element) => element.simulation_transient_current_graph_id)

  const simulationTransientVoltageGraphIds = circuitJson
    .filter(
      (element): element is SimulationTransientVoltageGraph =>
        isSimulationTransientVoltageGraph(element) &&
        element.simulation_experiment_id === simulationExperimentId,
    )
    .map((element) => element.simulation_transient_voltage_graph_id)

  if (
    simulationTransientCurrentGraphIds.length === 0 &&
    simulationTransientVoltageGraphIds.length === 0
  ) {
    return undefined
  }

  return {
    simulation_experiment_id: simulationExperimentId,
    simulation_transient_current_graph_ids: simulationTransientCurrentGraphIds,
    simulation_transient_voltage_graph_ids: simulationTransientVoltageGraphIds,
  }
}

const toFileNameSuffix = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const getUniqueFileNameSuffixes = (
  simulations: Array<{ simulation_experiment_id: string; name: string }>,
) => {
  const usedSuffixes = new Set<string>()
  return simulations.map((simulation) => {
    const baseSuffix =
      toFileNameSuffix(simulation.name) ||
      toFileNameSuffix(simulation.simulation_experiment_id) ||
      "simulation"
    let suffix = baseSuffix
    let duplicateIndex = 2
    while (usedSuffixes.has(suffix)) {
      suffix = `${baseSuffix}-${duplicateIndex++}`
    }
    usedSuffixes.add(suffix)
    return suffix
  })
}

export const getSimulationSvgAssetsFromCircuitJson = (
  circuitJson: AnyCircuitElement[],
) => {
  const simulationExperiments = circuitJson.filter(isSimulationExperiment)
  const fileNameSuffixes = getUniqueFileNameSuffixes(simulationExperiments)

  return simulationExperiments.flatMap((simulationExperiment, index) => {
    const simulationSvgInputs = getSimulationSvgInputs(
      circuitJson,
      simulationExperiment.simulation_experiment_id,
    )
    if (!simulationSvgInputs) return []

    return [
      {
        simulationExperimentId: simulationExperiment.simulation_experiment_id,
        simulationExperimentName: simulationExperiment.name,
        fileNameSuffix: fileNameSuffixes[index],
        simulationSvg: convertCircuitJsonToSimulationGraphSvg({
          circuitJson,
          ...simulationSvgInputs,
        }),
        schematicSimulationSvg: convertCircuitJsonToSchematicSimulationSvg({
          circuitJson,
          ...simulationSvgInputs,
        }),
      },
    ]
  })
}
