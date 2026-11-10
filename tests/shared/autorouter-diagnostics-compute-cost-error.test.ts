import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("error computeCost overrides progress and logs only the top five pairs", async () => {
  const f = await getComputeCostTestFixture({ logOnError: true })
  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", {
    ...f.phase,
    computeCost: { ...f.computeCost, totalIterations: 1, pairs: [] },
  })
  const computeCost = {
    ...f.computeCost,
    pairs: [
      f.computeCost.pairs[0],
      ...Array.from({ length: 5 }, (_, i) => ({
        ...f.computeCost.pairs[0],
        connectionName: `fallback-${i}`,
        pcbPortIds: [null, null],
        iterations: 5 - i,
        share: (5 - i) / 165,
      })),
    ],
  }
  f.root.emit("autorouting:error", {
    ...f.phase,
    computeCost,
    error: { message: "router failed" },
  })

  const output = f.logs.join("\n")
  expect(output).toContain("router failed")
  expect(output).toContain("R2.pin2 -> U1.pin2 43.0% (71 iters)")
  expect(output).toContain("fallback-3 -> fallback-3")
  expect(output).not.toContain("fallback-4 -> fallback-4")
  expect(f.finalize()[0].computeCost.totalIterations).toBe(165)
})
