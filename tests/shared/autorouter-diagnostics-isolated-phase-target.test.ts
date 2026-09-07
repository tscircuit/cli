import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  AutorouterDiagnostics,
  AutorouterPhaseTimeoutError,
} from "lib/shared/autorouter-diagnostics"

test("reaching the target phase in one scope does not disable a sibling's later phases", async () => {
  const debugDir = fs.mkdtempSync(path.join(os.tmpdir(), "routing-target-"))
  const root = new EventEmitter()
  const logs: string[] = []
  const diagnostics = new AutorouterDiagnostics({
    phaseName: "target",
    timeoutMs: 1,
    debugDir,
    log: (message) => logs.push(message),
  })
  diagnostics.attachToRootCircuit(root)
  const first = {
    subcircuit_id: "board",
    isolatedSubcircuitPath: ["first"],
    phaseName: "target",
    routingPhaseIndex: 0,
  }
  const second = { subcircuit_id: "board", isolatedSubcircuitPath: ["second"] }

  try {
    root.emit("autorouting:start", first)
    root.emit("autorouting:end", first)
    root.emit("autorouting:start", {
      ...second,
      phaseName: "prepare",
      routingPhaseIndex: 0,
    })
    root.emit("autorouting:end", {
      ...second,
      phaseName: "prepare",
      routingPhaseIndex: 0,
    })
    root.emit("autorouting:start", {
      ...second,
      phaseName: "target",
      routingPhaseIndex: 1,
    })
    root.emit("autorouting:progress", {
      ...second,
      phaseName: "target",
      routingPhaseIndex: 1,
      progress: 0.25,
    })
    await new Promise((resolve) => setTimeout(resolve, 5))

    let timeout: unknown
    try {
      diagnostics.checkTimeout()
    } catch (error) {
      timeout = error
    }
    expect(timeout).toBeInstanceOf(AutorouterPhaseTimeoutError)
    expect((timeout as Error).message).toContain("[isolated second]")
    expect(
      logs.some((line) =>
        line.includes("[isolated second] progress: progress=25%"),
      ),
    ).toBe(true)
    const artifact = JSON.parse(
      fs.readFileSync(
        (timeout as AutorouterPhaseTimeoutError).debugArtifactPath!,
        "utf8",
      ),
    )
    expect(artifact).toMatchObject({
      isolatedSubcircuitPath: ["second"],
      routingPhaseIndex: 1,
      phaseOrdinal: 2,
    })
  } finally {
    fs.rmSync(debugDir, { recursive: true, force: true })
  }
})
