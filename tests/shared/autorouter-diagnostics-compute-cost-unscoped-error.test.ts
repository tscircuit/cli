import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("preparation errors without a start or stage index report unscoped computeCostSummary", async () => {
  const fixture = await getComputeCostTestFixture({ logOnError: true })
  fixture.root.emit("autorouting:error", {
    subcircuit_id: fixture.phase.subcircuit_id,
    error: { message: "preparation failed" },
    computeCostSummary: fixture.computeCostSummary,
  })

  const [phase] = fixture.finalizeAndReadPhases()
  expect(phase.computeCostSummary.measuredPairCount).toBe(10)
  expect(phase.error.message).toBe("preparation failed")
  expect(phase).not.toHaveProperty("_actualRoutingPhaseOrderIndex")
  expect(phase).not.toHaveProperty("phaseOrdinal")
  expect(fixture.logs.join("\n")).toContain("R2.pin2 -> U1.pin2 (71 iters)")
})
