import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("malformed compute cost warns without throwing during error handling or finalization", async () => {
  const fixture = await getComputeCostTestFixture({ logOnError: true })
  const malformedCost = { ...fixture.computeCostSummary, topPairs: null }

  fixture.root.emit("autorouting:start", fixture.phase)
  expect(() =>
    fixture.root.emit("autorouting:error", {
      ...fixture.phase,
      computeCostSummary: malformedCost,
    }),
  ).not.toThrow()

  expect(() => fixture.finalizeAndReadPhases()).not.toThrow()
  expect(fixture.logs.join("\n")).toContain(
    "Warning: Could not format autorouter compute cost",
  )
})
