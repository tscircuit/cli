import {
  type AnyCircuitElement,
  type LayerRef,
  type SimulationAnalysisResult,
  simulation_pcb_return_current_field,
  simulation_pcb_return_current_heatmap,
  simulation_pcb_return_current_result,
} from "circuit-json"
import {
  convertCircuitJsonToPcbSimulationSvg,
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSimulationGraphSvg,
  isSimulationExperiment,
} from "circuit-to-svg"

export type SimulationSvgAsset = {
  simulationExperimentId: string
  simulationExperimentName: string
  fileNameSuffix: string
  simulationSvg: string
} & (
  | { kind: "spice"; schematicSimulationSvg: string }
  | {
      kind: "pcb-return-current"
      simulationResultId: string
      layer: LayerRef
      schematicSimulationSvg?: undefined
    }
)

const SIMULATION_ANALYSIS_RESULT_TYPES = new Set<string>([
  "simulation_transient_voltage_graph",
  "simulation_transient_current_graph",
  "simulation_dc_operating_point_voltage",
  "simulation_dc_operating_point_current",
  "simulation_dc_sweep_voltage_graph",
  "simulation_dc_sweep_current_graph",
  "simulation_ac_sweep_voltage_graph",
  "simulation_ac_sweep_current_graph",
] satisfies SimulationAnalysisResult["type"][])

const isSimulationAnalysisResult = (
  element: AnyCircuitElement,
): element is SimulationAnalysisResult =>
  SIMULATION_ANALYSIS_RESULT_TYPES.has(element.type)

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

const getFrequencySuffix = (frequencyHz: number | undefined) => {
  if (frequencyHz === undefined) return "frequency-independent"
  const [divisor, unit]: [number, string] =
    frequencyHz >= 1e9
      ? [1e9, "ghz"]
      : frequencyHz >= 1e6
        ? [1e6, "mhz"]
        : frequencyHz >= 1e3
          ? [1e3, "khz"]
          : [1, "hz"]
  return toFileNameSuffix(`${frequencyHz / divisor}${unit}`)
}

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

export const getSimulationSvgAssetsFromCircuitJson = async (
  circuitJson: AnyCircuitElement[],
  options: { includePcbReturnCurrent?: boolean } = {},
): Promise<SimulationSvgAsset[]> => {
  const simulationExperiments = circuitJson.filter(isSimulationExperiment)
  const fileNameSuffixes = getUniqueFileNameSuffixes(simulationExperiments)
  const usedSuffixes = new Set(fileNameSuffixes)

  const assets: SimulationSvgAsset[] = simulationExperiments.flatMap(
    (simulationExperiment, index): SimulationSvgAsset[] => {
      const simulationSvgInputs = getSimulationSvgInputs(
        circuitJson,
        simulationExperiment.simulation_experiment_id,
      )
      if (!simulationSvgInputs) return []

      return [
        {
          kind: "spice",
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
    },
  )
  if (options.includePcbReturnCurrent === false) return assets

  const results = circuitJson
    .filter(
      (element) => element.type === "simulation_pcb_return_current_result",
    )
    .map((element) => simulation_pcb_return_current_result.parse(element))
  const resultIds = new Set(
    results.map((result) => result.simulation_pcb_return_current_result_id),
  )
  const layersByResult = new Map<string, Set<LayerRef>>()

  for (const element of circuitJson) {
    if (
      element.type !== "simulation_pcb_return_current_field" &&
      element.type !== "simulation_pcb_return_current_heatmap"
    ) {
      continue
    }
    const overlay =
      element.type === "simulation_pcb_return_current_field"
        ? simulation_pcb_return_current_field.parse(element)
        : simulation_pcb_return_current_heatmap.parse(element)
    const resultId = overlay.simulation_pcb_return_current_result_id
    if (!resultIds.has(resultId)) {
      throw new Error(
        `Return-current overlay references missing result "${resultId}"`,
      )
    }
    const layers = layersByResult.get(resultId) ?? new Set<LayerRef>()
    layers.add(overlay.layer)
    layersByResult.set(resultId, layers)
  }

  for (const result of results) {
    const resultId = result.simulation_pcb_return_current_result_id
    const layers = layersByResult.get(resultId)
    if (!layers?.size) {
      throw new Error(
        `Return-current result "${resultId}" has no field or heatmap layers`,
      )
    }
    const experiment = simulationExperiments.find(
      (candidate) =>
        candidate.simulation_experiment_id === result.simulation_experiment_id,
    )
    for (const layer of layers) {
      const experimentSuffix =
        toFileNameSuffix(experiment?.name ?? "") || toFileNameSuffix(resultId)
      const frequencySuffix = getFrequencySuffix(result.frequency_hz)
      const baseSuffix = `return-current-${experimentSuffix}-${frequencySuffix}-${layer}`
      let suffix = baseSuffix
      let duplicateIndex = 2
      while (usedSuffixes.has(suffix)) {
        suffix = `${baseSuffix}-${duplicateIndex++}`
      }
      usedSuffixes.add(suffix)

      let simulationSvg: string
      try {
        simulationSvg = await convertCircuitJsonToPcbSimulationSvg(
          circuitJson,
          {
            simulationResultId: resultId,
            layer,
            includeVersion: false,
            returnCurrent: { showVectors: true },
          },
        )
      } catch (error) {
        throw new Error(
          `Failed to render return-current result "${resultId}" on "${layer}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        )
      }
      assets.push({
        kind: "pcb-return-current",
        simulationExperimentId: result.simulation_experiment_id,
        simulationExperimentName: experiment?.name ?? resultId,
        simulationResultId: resultId,
        layer,
        fileNameSuffix: suffix,
        simulationSvg,
      })
    }
  }

  return assets
}
