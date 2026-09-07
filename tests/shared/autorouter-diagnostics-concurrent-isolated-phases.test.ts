import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  AutorouterDiagnostics,
  AutorouterPhaseTimeoutError,
} from "lib/shared/autorouter-diagnostics"

test("completing one isolated sibling preserves the other sibling's progress and timeout", async () => {
  const debugDir = fs.mkdtempSync(path.join(os.tmpdir(), "routing-scopes-"))
  let parentDbReads = 0
  const root = Object.assign(new EventEmitter(), {
    db: {
      toArray: () => {
        parentDbReads++
        return []
      },
    },
  })
  const diagnostics = new AutorouterDiagnostics({
    timeoutMs: 1,
    dumpSrj: "all",
    debugDir,
    log: () => {},
  })
  diagnostics.attachToRootCircuit(root)
  const shared = { subcircuit_id: "subcircuit_0", routingPhaseIndex: 0 }
  const first = { ...shared, isolatedSubcircuitPath: ["outer", "first"] }
  const second = { ...shared, isolatedSubcircuitPath: ["outer", "second"] }

  try {
    root.emit("autorouting:start", {
      ...first,
      simpleRouteJson: { connections: [{ name: "first" }] },
    })
    root.emit("autorouting:start", {
      ...second,
      simpleRouteJson: { connections: [{ name: "second" }] },
    })
    root.emit("autorouting:progress", { ...first, progress: 0.25, steps: 12 })
    root.emit("autorouting:progress", { ...second, progress: 0.75, steps: 99 })
    root.emit("autorouting:end", {
      ...second,
      simpleRouteJson: {
        traces: [{ type: "pcb_trace", pcb_trace_id: "pcb_trace_0", route: [] }],
      },
    })
    root.emit("autorouting:progress", { ...second, progress: 1, steps: 100 })

    await new Promise((resolve) => setTimeout(resolve, 5))
    let timeout: unknown
    try {
      diagnostics.checkTimeout()
    } catch (error) {
      timeout = error
    }
    expect(timeout).toBeInstanceOf(AutorouterPhaseTimeoutError)
    const artifactPath = (timeout as AutorouterPhaseTimeoutError)
      .debugArtifactPath!
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"))
    expect(artifact.isolatedSubcircuitPath).toEqual(
      first.isolatedSubcircuitPath,
    )
    expect(artifact.phaseOrdinal).toBe(1)
    expect(artifact.lastProgress).toMatchObject({ progress: 0.25, steps: 12 })
    expect(artifact.files.boardCircuitJson).toBeUndefined()
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(debugDir, artifact.files.previousOutputTraces),
          "utf8",
        ),
      ),
    ).toEqual([])

    diagnostics.finalize([])
    const summary = JSON.parse(
      fs.readFileSync(path.join(debugDir, "board.meta.json"), "utf8"),
    )
    expect(summary.phases).toHaveLength(1)
    expect(summary.phases[0]).toMatchObject({
      isolatedSubcircuitPath: second.isolatedSubcircuitPath,
      phaseOrdinal: 1,
      outputTraceCount: 1,
    })
    expect(
      fs.existsSync(
        path.join(
          debugDir,
          "isolated",
          "outer",
          "second",
          "subcircuit_0",
          "phase-0.input.simple-route.json",
        ),
      ),
    ).toBe(true)
    expect(parentDbReads).toBe(0)
  } finally {
    fs.rmSync(debugDir, { recursive: true, force: true })
  }
})
