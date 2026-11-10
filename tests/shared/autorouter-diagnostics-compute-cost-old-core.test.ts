import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("old core events without computeCostSummary produce no computeCostSummary output or warnings", async () => {
  const f = await getComputeCostTestFixture({ logOnError: true, timeoutMs: 1 })
  const phase = { subcircuit_id: f.phase.subcircuit_id }
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:progress", { ...phase, steps: 3 })
  f.root.emit("autorouting:end", phase)
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:progress", phase)
  f.root.emit("autorouting:error", {
    ...phase,
    error: { message: "expected failure" },
  })
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:progress", phase)
  await new Promise((resolve) => setTimeout(resolve, 5))
  expect(() => f.diagnostics.checkTimeout()).toThrow("Autorouter timeout")

  const phases = f.finalize()
  expect(phases).toHaveLength(2)
  expect(JSON.stringify(phases)).not.toContain("computeCostSummary")
  expect(JSON.stringify(f.readJson("phase-2.timeout.json"))).not.toContain(
    "computeCostSummary",
  )
  expect(f.logs.join("\n")).not.toMatch(/hardest connections|Warning:/)
})
