import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("end computeCostSummary overrides progress with the computed ordinal fallback", async () => {
  const f = await getComputeCostTestFixture()
  const phase = { subcircuit_id: f.phase.subcircuit_id }
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:progress", {
    ...phase,
    computeCostSummary: f.computeCostSummary,
  })
  f.root.emit("autorouting:end", {
    ...phase,
    computeCostSummary: { ...f.computeCostSummary, measuredPairCount: 200 },
  })
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:end", {
    ...phase,
    computeCostSummary: f.computeCostSummary,
  })

  expect(
    f.finalize().map((p: any) => p.computeCostSummary.measuredPairCount),
  ).toEqual([200, 10])
  expect(f.logs.join("\n")).not.toContain("hardest connections:")
})
