import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("the end event's computeCostSummary replaces the one from progress", async () => {
  const fixture = await getComputeCostTestFixture()
  const progressCost = fixture.computeCostSummary
  const endCost = { ...fixture.computeCostSummary, measuredPairCount: 200 }
  // No stage index on the events: the stage is found by counting starts.
  const stage = { subcircuit_id: fixture.phase.subcircuit_id }

  fixture.root.emit("autorouting:start", stage)
  fixture.root.emit("autorouting:progress", {
    ...stage,
    computeCostSummary: progressCost,
  })
  fixture.root.emit("autorouting:end", {
    ...stage,
    computeCostSummary: endCost,
  })

  const [phase] = fixture.finalizeAndReadPhases()
  expect(phase.computeCostSummary.measuredPairCount).toBe(200)
  expect(fixture.logs.join("\n")).not.toContain("hardest connections:")
})
