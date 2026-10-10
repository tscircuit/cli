import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getSimulationSvgAssetsFromCircuitJson } from "lib/shared/simulation-svg-assets"

test("simulation SVG assets are separated and receive collision-safe names", () => {
  const circuitJson = ["Root", "Root", "Root-2", "Group"].flatMap(
    (name, index) => {
      const simulationExperimentId = `simulation_experiment_${index}`
      return [
        {
          type: "simulation_experiment",
          simulation_experiment_id: simulationExperimentId,
          name,
          experiment_type: "spice_transient_analysis",
          time_per_step: 0.5,
          start_time_ms: 0,
          end_time_ms: 1,
        },
        {
          type: "simulation_transient_voltage_graph",
          simulation_transient_voltage_graph_id: `simulation_transient_voltage_graph_${index}`,
          simulation_experiment_id: simulationExperimentId,
          voltage_levels: [0, index + 1, 0],
          time_per_step: 0.5,
          start_time_ms: 0,
          end_time_ms: 1,
          name,
        },
      ]
    },
  ) as AnyCircuitElement[]

  const assets = getSimulationSvgAssetsFromCircuitJson(circuitJson)

  expect(assets.map((asset) => asset.fileNameSuffix)).toEqual([
    "root",
    "root-2",
    "root-2-2",
    "group",
  ])
  for (const [index, asset] of assets.entries()) {
    expect(asset.simulationSvg).toContain(
      `data-simulation-experiment-id="simulation_experiment_${index}"`,
    )
    expect(asset.simulationSvg).toContain(
      `data-simulation-transient-voltage-graph-id="simulation_transient_voltage_graph_${index}"`,
    )
  }
})
