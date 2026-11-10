import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("error computeCostSummary overrides progress and logs only the top five pairs", async () => {
  const fixture = await getComputeCostTestFixture({ logOnError: true })
  fixture.root.emit("autorouting:start", fixture.phase)
  fixture.root.emit("autorouting:progress", {
    ...fixture.phase,
    computeCostSummary: {
      ...fixture.computeCostSummary,
      measuredPairCount: 1,
      topPairs: [],
    },
  })
  const [top] = fixture.computeCostSummary.topPairs
  const computeCostSummary = {
    ...fixture.computeCostSummary,
    topPairs: [
      top,
      ...Array.from({ length: 5 }, (_, i) => ({
        ...top,
        connectionName: `fallback-${i}`,
        pcbPortIds: [null, null],
        iterations: 5 - i,
      })),
    ],
  }
  fixture.root.emit("autorouting:error", {
    ...fixture.phase,
    computeCostSummary,
    error: { message: "router failed" },
  })

  const output = fixture.logs.join("\n")
  expect(output).toContain("router failed")
  expect(output).toContain("R2.pin2 -> U1.pin2 (71 iters)")
  expect(output).toContain("fallback-3 (2 iters)")
  expect(output).not.toContain("fallback-3 -> fallback-3")
  expect(output).not.toContain("fallback-4")
  expect(
    fixture.finalizeAndReadPhases()[0].computeCostSummary.measuredPairCount,
  ).toBe(10)
})
