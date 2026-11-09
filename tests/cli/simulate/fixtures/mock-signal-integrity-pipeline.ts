import { mock } from "bun:test"
import { createHash } from "node:crypto"
import { existsSync, writeFileSync } from "node:fs"
import type {
  PipelineBlockResult,
  PipelineOptions,
  PipelineResult,
} from "@tscircuit/signal-integrity-pipeline"
import { any_circuit_element, type SimulationSignal } from "circuit-json"

// Only the true public pipeline boundary is mocked, in an isolated CLI process.
// Waveforms are synthetic IO fixtures, not electrical simulation results.
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
    const blocks: PipelineBlockResult[] = circuitJson.flatMap((block) => {
      if (block.type !== "simulation_signal_integrity") return []
      const signals = circuitJson.filter(
        (signal): signal is SimulationSignal =>
          signal.type === "simulation_signal" &&
          signal.simulation_signal_integrity_id ===
            block.simulation_signal_integrity_id,
      )
      const matrix = signals.map(() => signals.map(() => 0))
      const results: PipelineBlockResult["results"] = [
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
        for (const { endpoint, end } of endpoints) {
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
            ...(signal.quiet ? { idle_voltage_v: 0.1 } : {}),
          })
        }
      }
      return [
        {
          simulation_signal_integrity_id: block.simulation_signal_integrity_id,
          name: block.name,
          duration_s: 1e-6,
          results,
          limitations: [],
        },
      ]
    })
    for (const block of blocks)
      for (const record of block.results) any_circuit_element.parse(record)
    return {
      circuitJson,
      simulationResultCircuitJson: [
        ...circuitJson,
        ...blocks.flatMap((block) => block.results),
      ],
      blocks,
      files: blocks.length
        ? {
            "waveforms.csv":
              "simulation_signal_id,end,source_port_id,time_s,voltage_v,idle_voltage_v\n" +
              blocks
                .flatMap((block) =>
                  block.results.flatMap((record) =>
                    record.type === "simulation_signal_waveform"
                      ? record.timestamps_s.map((time, i) =>
                          [
                            record.simulation_signal_id,
                            record.end,
                            record.source_port_id,
                            time,
                            record.voltage_levels[i],
                            record.idle_voltage_v ?? "",
                          ].join(","),
                        )
                      : [],
                  ),
                )
                .join("\n"),
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
