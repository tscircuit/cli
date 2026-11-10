import { expect, test } from "bun:test"
import { AutorouterPhaseTimeoutError } from "lib/shared/autorouter-diagnostics"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("timeout artifacts include the latest computeCostSummary using the computed ordinal fallback", async () => {
  const f = await getComputeCostTestFixture({ timeoutMs: 1 })
  const phase = { subcircuit_id: f.phase.subcircuit_id }
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:progress", {
    ...phase,
    computeCostSummary: f.computeCostSummary,
  })
  await new Promise((resolve) => setTimeout(resolve, 5))

  expect(() => f.diagnostics.checkTimeout()).toThrow(
    AutorouterPhaseTimeoutError,
  )
  const artifact = f.readJson("phase-0.timeout.json")
  expect(artifact.computeCostSummary.measuredPairCount).toBe(10)
  expect(artifact.computeCostSummary.topPairs[0].labels).toEqual([
    "R2.pin2",
    "U1.pin2",
  ])
  expect(artifact.lastProgress).not.toHaveProperty("computeCostSummary")
})
