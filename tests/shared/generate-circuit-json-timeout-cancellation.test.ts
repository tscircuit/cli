import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { AutorouterPhaseTimeoutError } from "lib/shared/autorouter-diagnostics"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"

test("circuit generation cancels the active renderer when routing times out", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "routing-timeout-"))
  const moduleDirectory = path.join(directory, "node_modules", "tscircuit")
  fs.mkdirSync(moduleDirectory, { recursive: true })
  fs.writeFileSync(
    path.join(moduleDirectory, "package.json"),
    JSON.stringify({ name: "tscircuit", type: "module", main: "index.js" }),
  )
  const modulePath = path.join(moduleDirectory, "index.js")
  fs.writeFileSync(
    modulePath,
    `import { EventEmitter } from "node:events"
export const state = { ticks: 0, interval: undefined, cancellationReason: undefined }
export class RootCircuit extends EventEmitter {
  add() {}
  render() {
    if (state.interval !== undefined) return
    state.interval = setInterval(() => state.ticks++, 1)
    this.emit("autorouting:start", { subcircuit_id: "board" })
  }
  isDoneRendering() { return false }
  getRunningAsyncEffects() { return [{ effectName: "autorouting" }] }
  getCircuitJson() { return [] }
  cancelRendering(reason) {
    state.cancellationReason = reason
    clearInterval(state.interval)
    state.interval = undefined
  }
}`,
  )
  const circuitPath = path.join(directory, "index.circuit.tsx")
  fs.writeFileSync(circuitPath, "export default () => null")
  const { state } = await import(pathToFileURL(modulePath).href)
  const effects: string[] = []

  try {
    const error = await generateCircuitJson({
      filePath: circuitPath,
      projectDir: directory,
      onAsyncEffectStatus: (name) => effects.push(name),
      autorouterDiagnostics: {
        timeoutMs: 10,
        debugDir: path.join(directory, "debug"),
        log: () => {},
      },
    }).catch((error) => error)

    expect(error).toBeInstanceOf(AutorouterPhaseTimeoutError)
    expect(state.cancellationReason).toBe(error)
    expect(state.interval).toBeUndefined()
    expect(state.ticks).toBeGreaterThan(0)
    expect(effects).toEqual(["autorouting"])
  } finally {
    clearInterval(state.interval)
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
