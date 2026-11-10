import { expect, test } from "bun:test"
import fs from "node:fs"
import { AutorouterPhaseTimeoutError } from "lib/shared/autorouter-diagnostics"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("computeCostSummary formatting and artifact write failures warn without aborting routing", async () => {
  const f = await getComputeCostTestFixture({ logOnError: true, timeoutMs: 1 })
  f.root.emit("autorouting:start", f.phase)
  expect(() =>
    f.root.emit("autorouting:error", {
      ...f.phase,
      computeCostSummary: { ...f.computeCostSummary, topPairs: null },
    }),
  ).not.toThrow()
  expect(() => f.finalize()).not.toThrow()
  expect(f.logs.join("\n")).toContain(
    "Warning: Could not format autorouter compute cost",
  )

  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", {
    ...f.phase,
    computeCostSummary: f.computeCostSummary,
  })
  expect(() => f.root.emit("autorouting:end", f.phase)).not.toThrow()
  fs.rmSync(f.debugDir, { recursive: true })
  fs.writeFileSync(f.debugDir, "blocked")
  expect(() => f.diagnostics.finalize()).not.toThrow()
  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", {
    ...f.phase,
    computeCostSummary: f.computeCostSummary,
  })
  await new Promise((resolve) => setTimeout(resolve, 5))
  expect(() => f.diagnostics.checkTimeout()).toThrow(
    AutorouterPhaseTimeoutError,
  )
  expect(f.logs.join("\n")).toContain(
    "Warning: Could not write autorouter debug artifact board.meta.json",
  )
  expect(f.logs.join("\n")).toContain(
    "Warning: Could not write autorouter debug artifact phase-2.timeout.json",
  )
})
