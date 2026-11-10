import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("sibling subcircuits routing at the same time keep their own computeCostSummary", async () => {
  const fixture = await getComputeCostTestFixture()
  const costA = fixture.computeCostSummary
  const costB = { ...fixture.computeCostSummary, measuredPairCount: 400 }
  const costA2 = { ...fixture.computeCostSummary, measuredPairCount: 700 }
  const stageA = { ...fixture.phase, routingPhaseIndex: 19 }
  const stageB = { ...stageA, subcircuit_id: "subcircuit_b" }
  // Same routingPhaseIndex as stageA, but routed later.
  const stageA2 = { ...stageA, _actualRoutingPhaseOrderIndex: 1 }

  fixture.root.emit("autorouting:start", stageA)
  fixture.root.emit("autorouting:start", stageB)
  fixture.root.emit("autorouting:progress", {
    ...stageA,
    computeCostSummary: costA,
  })
  fixture.root.emit("autorouting:progress", {
    ...stageB,
    computeCostSummary: costB,
  })
  fixture.root.emit("autorouting:end", stageA)
  fixture.root.emit("autorouting:end", stageB)
  fixture.root.emit("autorouting:start", stageA2)
  fixture.root.emit("autorouting:progress", {
    ...stageA2,
    computeCostSummary: costA2,
  })
  fixture.root.emit("autorouting:end", stageA2)

  const [phaseA, phaseB, phaseA2] = fixture.finalizeAndReadPhases()
  expect(phaseA).toMatchObject({
    subcircuit_id: "subcircuit_a",
    computeCostSummary: { measuredPairCount: costA.measuredPairCount },
  })
  expect(phaseB).toMatchObject({
    subcircuit_id: "subcircuit_b",
    computeCostSummary: { measuredPairCount: costB.measuredPairCount },
  })
  expect(phaseA2).toMatchObject({
    subcircuit_id: "subcircuit_a",
    computeCostSummary: { measuredPairCount: costA2.measuredPairCount },
  })
})
