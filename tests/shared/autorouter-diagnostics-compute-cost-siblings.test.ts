import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("interleaved sibling subcircuits keep independent computeCost by actual stage order", async () => {
  const f = await getComputeCostTestFixture()
  const a = { ...f.phase, routingPhaseIndex: 19 }
  const b = { ...a, subcircuit_id: "subcircuit_b" }
  f.root.emit("autorouting:start", a)
  f.root.emit("autorouting:start", b)
  f.root.emit("autorouting:progress", { ...a, computeCost: f.computeCost })
  f.root.emit("autorouting:progress", {
    ...b,
    computeCost: { ...f.computeCost, totalIterations: 400 },
  })
  f.root.emit("autorouting:end", a)
  f.root.emit("autorouting:end", b)
  // A second stage with the same public routingPhaseIndex must not reuse computeCost.
  const next = { ...a, _actualRoutingPhaseOrderIndex: 1 }
  f.root.emit("autorouting:start", next)
  f.root.emit("autorouting:progress", {
    ...next,
    computeCost: { ...f.computeCost, totalIterations: 700 },
  })
  f.root.emit("autorouting:end", next)

  expect(
    f
      .finalize()
      .map((p: any) => [
        p.subcircuit_id,
        p._actualRoutingPhaseOrderIndex,
        p.computeCost.totalIterations,
      ]),
  ).toEqual([
    ["subcircuit_a", 0, 165],
    ["subcircuit_b", 0, 400],
    ["subcircuit_a", 1, 700],
  ])
  expect(f.logs.join("\n")).not.toContain("hardest connections:")
})
