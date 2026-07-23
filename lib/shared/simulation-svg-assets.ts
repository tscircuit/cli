import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSimulationGraphSvg,
  isSimulationAnalysisResult,
  isSimulationExperiment,
} from "circuit-to-svg"

const getSimulationSvgInputs = (
  circuitJson: AnyCircuitElement[],
  simulationExperimentId: string,
) => {
  const hasAnalysisResult = circuitJson.some(
    (element) =>
      isSimulationAnalysisResult(element) &&
      element.simulation_experiment_id === simulationExperimentId,
  )

  if (!hasAnalysisResult) {
    return undefined
  }

  return {
    simulation_experiment_id: simulationExperimentId,
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
