import { EventEmitter } from "node:events"
import type { CircuitJson } from "circuit-json"
import fixture from "./native-two-stage-diagnostics.json"
import { AutorouterDiagnostics } from "lib/shared/autorouter-diagnostics"
/** Re-emits captured synthetic native events. Geometry is unchanged PCB-world
 * points in mm, +X right, +Y up, +Z above, right handed. */
export function emitNativeTwoStageDiagnostics(
  debugDir: string,
  enabled = true,
  singleStage = false,
) {
  const root = new EventEmitter() as EventEmitter & {
    db: { toArray: () => CircuitJson }
  }
  root.db = {
    toArray: () =>
      fixture.circuitJson.filter(
        (row) => row.type !== "pcb_trace",
      ) as CircuitJson,
  }
  const diagnostics = new AutorouterDiagnostics({
    debugDir,
    enabled,
    dumpSrj: "all",
    log: () => {},
  })
  diagnostics.attachToRootCircuit(root)
  const stages = singleStage
    ? [
        {
          input: fixture.stages[0]!.input,
          output: fixture.stages.at(-1)!.output,
        },
      ]
    : fixture.stages
  for (const [phaseStageIndex, stage] of stages.entries()) {
    const meta = {
      subcircuit_id: "subcircuit_source_group_0",
      phaseName: "native-critical-and-follow-up",
      routingPhaseIndex: 7,
      phaseStageIndex,
      phaseStageCount: stages.length,
      phaseOrdinal: phaseStageIndex + 1,
      phaseCount: stages.length,
    }
    root.emit("autorouting:start", { ...meta, simpleRouteJson: stage.input })
    root.emit("autorouting:end", { ...meta, simpleRouteJson: stage.output })
  }
  diagnostics.finalize(fixture.circuitJson as CircuitJson)
  return { fixture, stages }
}
