import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  AutorouterDiagnostics,
  AutorouterPhaseTimeoutError,
} from "lib/shared/autorouter-diagnostics"

test("late progress and completion from an earlier phase cannot alter its successor", async () => {
  const debugDir = fs.mkdtempSync(path.join(os.tmpdir(), "routing-stale-"))
  const root = new EventEmitter()
  const diagnostics = new AutorouterDiagnostics({
    timeoutMs: 1,
    debugDir,
    log: () => {},
  })
  diagnostics.attachToRootCircuit(root)
  const shared = { subcircuit_id: "board", isolatedSubcircuitPath: ["child"] }
  const first = { ...shared, routingPhaseIndex: 0, phaseStageIndex: 0 }
  const second = { ...shared, routingPhaseIndex: 1, phaseStageIndex: 1 }

  try {
    root.emit("autorouting:start", first)
    root.emit("autorouting:end", first)
    root.emit("autorouting:start", second)
    root.emit("autorouting:progress", { ...second, progress: 0.5 })
    root.emit("autorouting:progress", { ...first, progress: 1 })
    root.emit("autorouting:end", first)
    root.emit("autorouting:error", { ...first, error: "late error" })

    await new Promise((resolve) => setTimeout(resolve, 5))
    let timeout: unknown
    try {
      diagnostics.checkTimeout()
    } catch (error) {
      timeout = error
    }
    expect(timeout).toBeInstanceOf(AutorouterPhaseTimeoutError)
    const artifact = JSON.parse(
      fs.readFileSync(
        (timeout as AutorouterPhaseTimeoutError).debugArtifactPath!,
        "utf8",
      ),
    )
    expect(artifact.routingPhaseIndex).toBe(1)
    expect(artifact.phaseOrdinal).toBe(2)
    expect(artifact.lastProgress.progress).toBe(0.5)
  } finally {
    fs.rmSync(debugDir, { recursive: true, force: true })
  }
})
