import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getSimulationSvgAssetsFromCircuitJson } from "lib/shared/simulation-svg-assets"

test("creates SVG assets for non-transient simulation analyses", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "simulation_experiment_dc_op",
      name: "Bias Point",
      experiment_type: "spice_dc_operating_point",
    },
    {
      type: "simulation_dc_operating_point_voltage",
      simulation_dc_operating_point_voltage_id: "dc_op_vout",
      simulation_experiment_id: "simulation_experiment_dc_op",
      simulation_voltage_probe_id: "probe_vout",
      name: "VOUT",
      voltage: 3.3,
    },
  ]

  const assets = getSimulationSvgAssetsFromCircuitJson(circuitJson)

  expect(assets).toHaveLength(1)
  expect(assets[0]?.fileNameSuffix).toBe("bias-point")
  expect(assets[0]?.simulationSvg).toContain("Operating Point")
  expect(assets[0]?.simulationSvg).toContain("dc_op_vout")
})
