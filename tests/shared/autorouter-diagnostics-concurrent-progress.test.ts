import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import { AutorouterDiagnostics } from "lib/shared/autorouter-diagnostics"

test("long-running diagnostics report each active scope's own progress", async () => {
  const root = new EventEmitter()
  const logs: string[] = []
  const diagnostics = new AutorouterDiagnostics({
    longRunningLogThresholdMs: 1,
    log: (message) => logs.push(message),
  })
  diagnostics.attachToRootCircuit(root)
  const first = { subcircuit_id: "board", isolatedSubcircuitPath: ["first"] }
  const second = { subcircuit_id: "board", isolatedSubcircuitPath: ["second"] }
  root.emit("autorouting:start", first)
  root.emit("autorouting:start", second)
  root.emit("autorouting:progress", { ...first, progress: 0.25 })
  root.emit("autorouting:progress", { ...second, progress: 0.75 })

  await new Promise((resolve) => setTimeout(resolve, 5))
  diagnostics.checkTimeout()

  expect(
    logs.some((line) =>
      line.includes("[isolated first] progress: progress=25%"),
    ),
  ).toBe(true)
  expect(
    logs.some((line) =>
      line.includes("[isolated second] progress: progress=75%"),
    ),
  ).toBe(true)
  expect(logs.filter((line) => line.includes("has been running"))).toHaveLength(
    2,
  )
})
