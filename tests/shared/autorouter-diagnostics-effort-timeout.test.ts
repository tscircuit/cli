import { expect, test } from "bun:test"
import { AutorouterPhaseTimeoutError } from "lib/shared/autorouter-diagnostics"
import { getRouteEffortTestFixture } from "tests/fixtures/get-route-effort-test-fixture"

test("timeout artifacts include the latest effort using the computed ordinal fallback", async () => {
  const f = await getRouteEffortTestFixture({ timeoutMs: 1 })
  const phase = { subcircuit_id: f.phase.subcircuit_id }
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:progress", { ...phase, routeEffort: f.routeEffort })
  await new Promise((resolve) => setTimeout(resolve, 5))

  expect(() => f.diagnostics.checkTimeout()).toThrow(
    AutorouterPhaseTimeoutError,
  )
  const artifact = f.readJson("phase-0.timeout.json")
  expect(artifact.routeEffort.totalIterations).toBe(165)
  expect(artifact.routeEffort.pairs[0].labels).toEqual(["R2.pin2", "U1.pin2"])
  expect(artifact.lastProgress).not.toHaveProperty("routeEffort")
})
