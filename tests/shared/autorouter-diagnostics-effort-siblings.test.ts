import { expect, test } from "bun:test"
import { getRouteEffortTestFixture } from "tests/fixtures/get-route-effort-test-fixture"

test("interleaved sibling subcircuits keep independent effort by actual stage order", async () => {
  const f = await getRouteEffortTestFixture()
  const a = { ...f.phase, routingPhaseIndex: 19 }
  const b = { ...a, subcircuit_id: "subcircuit_b" }
  f.root.emit("autorouting:start", a)
  f.root.emit("autorouting:start", b)
  f.root.emit("autorouting:progress", { ...a, routeEffort: f.routeEffort })
  f.root.emit("autorouting:progress", {
    ...b,
    routeEffort: { ...f.routeEffort, totalIterations: 400 },
  })
  f.root.emit("autorouting:end", a)
  f.root.emit("autorouting:end", b)
  // A second stage with the same public routingPhaseIndex must not reuse effort.
  const next = { ...a, _actualRoutingPhaseOrderIndex: 1 }
  f.root.emit("autorouting:start", next)
  f.root.emit("autorouting:progress", {
    ...next,
    routeEffort: { ...f.routeEffort, totalIterations: 700 },
  })
  f.root.emit("autorouting:end", next)

  expect(
    f
      .finalize()
      .map((p: any) => [
        p.subcircuit_id,
        p._actualRoutingPhaseOrderIndex,
        p.routeEffort.totalIterations,
      ]),
  ).toEqual([
    ["subcircuit_a", 0, 165],
    ["subcircuit_b", 0, 400],
    ["subcircuit_a", 1, 700],
  ])
  expect(f.logs.join("\n")).not.toContain("hardest connections:")
})
