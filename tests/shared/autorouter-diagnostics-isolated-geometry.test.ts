import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { AutorouterDiagnostics } from "lib/shared/autorouter-diagnostics"

test("isolated phases do not consume parent placement snapshots or mix child traces into them", () => {
  const debugDir = fs.mkdtempSync(path.join(os.tmpdir(), "routing-geometry-"))
  let parentDbReads = 0
  const root = Object.assign(new EventEmitter(), {
    db: {
      toArray: () => {
        parentDbReads++
        return [
          {
            type: "pcb_board",
            pcb_board_id: "board",
            center: { x: 0, y: 0 },
            width: 10,
            height: 10,
            thickness: 1.4,
            num_layers: 2,
            material: "fr4",
          },
        ]
      },
    },
  })
  const diagnostics = new AutorouterDiagnostics({
    enabled: true,
    dumpSrj: "all",
    debugDir,
    log: () => {},
  })
  diagnostics.attachToRootCircuit(root)
  const isolated = { subcircuit_id: "board", isolatedSubcircuitPath: ["child"] }

  try {
    root.emit("autorouting:start", isolated)
    root.emit("autorouting:end", {
      ...isolated,
      simpleRouteJson: {
        traces: [{ type: "pcb_trace", pcb_trace_id: "pcb_trace_0", route: [] }],
      },
    })
    expect(parentDbReads).toBe(0)
    expect(fs.existsSync(path.join(debugDir, "placement-unrouted.png"))).toBe(
      false,
    )
    expect(fs.existsSync(path.join(debugDir, "phase-0-routed.png"))).toBe(false)

    root.emit("autorouting:start", { subcircuit_id: "board" })
    expect(fs.existsSync(path.join(debugDir, "placement-unrouted.png"))).toBe(
      true,
    )
    root.emit("autorouting:end", {
      subcircuit_id: "board",
      simpleRouteJson: { traces: [] },
    })
    expect(fs.existsSync(path.join(debugDir, "phase-0-routed.png"))).toBe(true)
    expect(
      (diagnostics as any)
        .getCircuitJsonWithCompletedPhaseTraces()
        .filter((element: { type: string }) => element.type === "pcb_trace"),
    ).toEqual([])
  } finally {
    fs.rmSync(debugDir, { recursive: true, force: true })
  }
})
