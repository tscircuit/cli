import { mock } from "bun:test"
import { existsSync, writeFileSync } from "node:fs"
import type { AnyCircuitElement } from "circuit-json"

// Only the pipeline boundary is mocked, in an isolated CLI process. These are
// formatting fixtures, not solver measurements or proof of electrical accuracy.
mock.module("@tscircuit/signal-integrity-pipeline", () => ({
  async runPipeline(...args: [AnyCircuitElement[]]) {
    if (args.length !== 1 || !Array.isArray(args[0]))
      throw new Error("Expected runPipeline(circuitJson)")
    if (existsSync("pipeline-input.json"))
      throw new Error("Pipeline called more than once")
    const [circuitJson] = args
    writeFileSync("pipeline-input.json", JSON.stringify(circuitJson))
    if (process.env.TSCI_TEST_PIPELINE_ERROR)
      throw new Error("Signal integrity solver failed")
    return circuitJson.flatMap((record): AnyCircuitElement[] => {
      if (record.type === "simulation_signal_integrity") {
        const signal_order = circuitJson.flatMap((signal) =>
          signal.type === "simulation_signal" &&
          signal.simulation_signal_integrity_id ===
            record.simulation_signal_integrity_id
            ? [signal.simulation_signal_id]
            : [],
        )
        const matrix = signal_order.map(() => signal_order.map(() => 0))
        return [
          {
            type: "simulation_signal_integrity_rlgc",
            simulation_signal_integrity_rlgc_id: `${record.simulation_signal_integrity_id}_rlgc`,
            simulation_signal_integrity_id:
              record.simulation_signal_integrity_id,
            signal_order,
            r_ohm: matrix,
            l_h: matrix,
            c_f: matrix,
            g_s: matrix,
          },
        ]
      }
      if (record.type !== "simulation_signal") return []
      const { simulation_signal_id } = record
      return record.receivers.flatMap((receiver): AnyCircuitElement[] => {
        const source_port_id =
          receiver.kind === "single"
            ? receiver.source_port_id
            : receiver.p_source_port_id
        const id = `${simulation_signal_id}_${source_port_id}`
        if (record.quiet)
          return [
            {
              type: "simulation_signal_crosstalk",
              simulation_signal_crosstalk_id: id,
              simulation_signal_id,
              source_port_id,
              peak_next_v: 0.012,
              peak_fext_v: 0.025,
            },
          ]
        return [
          {
            type: "simulation_signal_waveform",
            simulation_signal_waveform_id: id,
            simulation_signal_id,
            source_port_id,
            end: "far",
            timestamps_s: [0, 50e-9],
            voltage_levels: [0, 3.3],
          },
          {
            type: "simulation_signal_eye",
            simulation_signal_eye_id: id,
            simulation_signal_id,
            source_port_id,
            folded_traces: [
              { timestamps_s: [0, 50e-9], voltage_levels: [0, 3.3] },
            ],
            eye_height_v: 2.5,
            eye_width_s: 40e-9,
            mask_margin_v: -0.1,
          },
          ...(record.strobe_simulation_signal_id
            ? [
                {
                  type: "simulation_signal_strobe_margin" as const,
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
                },
              ]
            : []),
        ]
      })
    })
  },
}))
