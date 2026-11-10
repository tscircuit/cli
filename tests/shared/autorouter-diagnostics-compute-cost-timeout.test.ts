import { expect, test } from "bun:test"
import { AutorouterPhaseTimeoutError } from "lib/shared/autorouter-diagnostics"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("timeout artifacts retain labeled progress cost when events omit stage order", async () => {
  const fixture = await getComputeCostTestFixture({ timeoutMs: 1 })
  const phase = { subcircuit_id: fixture.phase.subcircuit_id }
  fixture.root.emit("autorouting:start", phase)
  fixture.root.emit("autorouting:progress", {
    ...phase,
    computeCostSummary: fixture.computeCostSummary,
  })
  await new Promise((resolve) => setTimeout(resolve, 5))

  expect(() => fixture.diagnostics.checkTimeout()).toThrow(
    AutorouterPhaseTimeoutError,
  )
  const artifact = fixture.readJson("phase-0.timeout.json")
  expect(artifact.computeCostSummary.measuredPairCount).toBe(10)
  expect(artifact.computeCostSummary.topPairs[0].labels).toEqual([
    "R2.pin2",
    "U1.pin2",
  ])
  expect(artifact.lastProgress).not.toHaveProperty("computeCostSummary")
})
