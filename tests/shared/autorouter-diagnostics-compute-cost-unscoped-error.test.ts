import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("preparation errors without a start or stage index report unscoped computeCost", async () => {
  const f = await getComputeCostTestFixture({ logOnError: true })
  f.root.emit("autorouting:error", {
    subcircuit_id: f.phase.subcircuit_id,
    error: { message: "preparation failed" },
    computeCost: f.computeCost,
  })

  const [phase] = f.finalize()
  expect(phase.computeCost.totalIterations).toBe(165)
  expect(phase.error.message).toBe("preparation failed")
  expect(phase).not.toHaveProperty("_actualRoutingPhaseOrderIndex")
  expect(phase).not.toHaveProperty("phaseOrdinal")
  expect(f.logs.join("\n")).toContain("R2.pin2 -> U1.pin2 43.0% (71 iters)")
})
