import { mock } from "bun:test"
import { createHash } from "node:crypto"
import { existsSync, writeFileSync } from "node:fs"
import type {
  BlockResult,
  PipelineOptions,
  PipelineResult,
} from "@tscircuit/signal-integrity-pipeline"
import type { SimulationSignal } from "circuit-json"

// Only the true public pipeline boundary is mocked, in an isolated CLI process.
// Metrics are synthetic formatting fixtures, not electrical measurements.
mock.module("@tscircuit/signal-integrity-pipeline", () => ({
  async runPipeline({
    circuitJson,
    ibisSources,
    runSolver,
  }: PipelineOptions): Promise<PipelineResult> {
    if (!Array.isArray(circuitJson) || typeof runSolver !== "function")
      throw new Error(
        "Expected runPipeline({ circuitJson, ibisSources, runSolver })",
      )
    if (existsSync("pipeline-input.json"))
      throw new Error("Pipeline called more than once")
    writeFileSync("pipeline-input.json", JSON.stringify(circuitJson))
    for (const record of circuitJson) {
      if (record.type !== "simulation_ibis_model") continue
      const bytes = ibisSources[record.ibis_model_asset.project_relative_path]
      const hashes: Record<string, string> = {
        "models/sn74lvc1g04.ibs":
          "03033638d7fe8bf268428be133a5aad63aae0145980113561b20ab92063e2c00",
        "models/sn65hvd72.ibs":
          "293f71f8d6c8764914a73564ebbb5b9e0e706d9dcc18d87aae91f1def06ca47e",
      }
      if (
        !bytes ||
        createHash("sha256").update(bytes).digest("hex") !==
          hashes[record.ibis_model_asset.project_relative_path]
      )
        throw new Error("Expected real TI IBIS bytes from the node adapter")
    }
    if (process.env.TSCI_TEST_PIPELINE_ERROR)
      throw new Error("Signal integrity solver failed")
    const blocks: BlockResult[] = circuitJson.flatMap((block) => {
      if (block.type !== "simulation_signal_integrity") return []
      const signals = circuitJson.filter(
        (signal): signal is SimulationSignal =>
          signal.type === "simulation_signal" &&
          signal.simulation_signal_integrity_id ===
            block.simulation_signal_integrity_id,
      )
      const matrix = signals.map(() => signals.map(() => 0))
      const results: BlockResult["results"] = [
        {
          type: "simulation_signal_integrity_rlgc",
          simulation_signal_integrity_rlgc_id: `${block.simulation_signal_integrity_id}_rlgc`,
          simulation_signal_integrity_id: block.simulation_signal_integrity_id,
          conductors: signals.map((signal) => ({
            simulation_signal_id: signal.simulation_signal_id,
            leg: "single",
          })),
          matrices: [
            {
              frequency_hz: 1e6,
              r_ohm: matrix,
              l_h: matrix,
              c_f: matrix,
              g_s: matrix,
            },
          ],
        },
      ]
      for (const signal of signals) {
        const { simulation_signal_id } = signal
        const endpoints = signal.quiet
          ? [
              { endpoint: signal.driver, end: "near" as const },
              ...signal.receivers.map((endpoint) => ({
                endpoint,
                end: "far" as const,
              })),
            ]
          : signal.receivers.map((endpoint) => ({
              endpoint,
              end: "far" as const,
            }))
        for (const [index, { endpoint, end }] of endpoints.entries()) {
          const source_port_id =
            endpoint.kind === "single"
              ? endpoint.source_port_id
              : endpoint.p_source_port_id
          const id = `${simulation_signal_id}_${source_port_id}_${end}`
          results.push({
            type: "simulation_signal_waveform",
            simulation_signal_waveform_id: id,
            simulation_signal_id,
            source_port_id,
            end,
            timestamps_s: [0, 1e-6],
            voltage_levels: [0, 3.3],
          })
          if (signal.quiet) {
            results.push({
              type: "simulation_signal_crosstalk",
              simulation_signal_crosstalk_id: id,
              simulation_signal_id,
              source_port_id,
              end,
              idle_voltage_v: 0.1,
              peak_positive_v: (index + 1) * 0.012,
              peak_negative_v: -(index + 1) * 0.025,
            })
            continue
          }
          results.push({
            type: "simulation_signal_eye",
            simulation_signal_eye_id: id,
            simulation_signal_id,
            source_port_id,
            folded_traces: [
              { timestamps_s: [0, 100e-9], voltage_levels: [0, 3.3] },
            ],
            eye_height_v: 2.5,
            eye_width_s: 40e-9,
            mask_margin_v: -0.1,
          })
          if (signal.strobe_simulation_signal_id)
            results.push({
              type: "simulation_signal_strobe_margin",
              simulation_signal_strobe_margin_id: id,
              simulation_signal_id,
              source_port_id,
              edges: [
                {
                  time_s: 50e-9,
                  setup_margin_s: -20e-12,
                  hold_margin_s: 30e-12,
                },
              ],
              worst_setup_margin_s: -20e-12,
              worst_hold_margin_s: 30e-12,
            })
        }
      }
      return [
        {
          simulationSignalIntegrityId: block.simulation_signal_integrity_id,
          name: block.name ?? block.simulation_signal_integrity_id,
          duration_s: 1e-6,
          geometry: {
            cells: [],
            mappings: [],
            units: { circuitJson: "mm", geometry: "m", conductivity: "S/m" },
            approximations: [],
          },
          matrices: [],
          experiments: [],
          results,
          limitations: [],
          numericalSettings: {
            reduction: "routed-copper",
            sections: 1,
            lanes: [],
            extraction: {
              minimumHz: 1e3,
              maximumHz: 1e9,
              modelHz: 1e6,
              filaments: 1,
              refinementFilaments: 2,
              convergenceTolerance: 0.1,
              capTolerance: 0.1,
              maxPanelLengthMm: 1,
              reciprocityTolerance: 0.1,
              dcResistanceTolerance: 0.1,
            },
          },
        },
      ]
    })
    return {
      circuitJson,
      simulationResultCircuitJson: [
        ...circuitJson,
        ...blocks.flatMap((block) => block.results),
      ],
      blocks,
      geometry: blocks[0]?.geometry,
      matrices: blocks[0]?.matrices ?? [],
      experiments: [],
      limitations: [],
      files: blocks.length
        ? {
            "blocks/summary.json": JSON.stringify(
              blocks.map((block) => block.name),
            ),
            ...(process.env.TSCI_TEST_INVALID_ARTIFACT
              ? { "../outside.txt": "invalid" }
              : {}),
          }
        : {},
    }
  },
}))
