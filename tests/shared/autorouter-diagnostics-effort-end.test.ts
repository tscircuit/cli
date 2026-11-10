import { expect, test } from "bun:test"
import { getRouteEffortTestFixture } from "tests/fixtures/get-route-effort-test-fixture"

test("end effort overrides progress with the computed ordinal fallback", async () => {
  const f = await getRouteEffortTestFixture()
  const phase = { subcircuit_id: f.phase.subcircuit_id }
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:progress", { ...phase, routeEffort: f.routeEffort })
  f.root.emit("autorouting:end", {
    ...phase,
    routeEffort: { ...f.routeEffort, totalIterations: 200 },
  })
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:end", { ...phase, routeEffort: f.routeEffort })

  expect(f.finalize().map((p: any) => p.routeEffort.totalIterations)).toEqual([
    200, 165,
  ])
  expect(f.logs.join("\n")).not.toContain("hardest connections:")
})
