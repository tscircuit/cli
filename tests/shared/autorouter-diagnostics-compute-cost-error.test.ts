import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("error computeCost overrides progress and logs only the top five pairs", async () => {
  const f = await getComputeCostTestFixture({ logOnError: true })
  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", {
    ...f.phase,
    computeCost: {
      value: 1,
      summary: { ...f.computeCost.summary, topPairs: [] },
    },
  })
  const [top] = f.computeCost.summary.topPairs
  const computeCost = {
    ...f.computeCost,
    summary: {
      ...f.computeCost.summary,
      topPairs: [
        top,
        ...Array.from({ length: 5 }, (_, i) => ({
          ...top,
          connectionName: `fallback-${i}`,
          pcbPortIds: [null, null],
          iterations: 5 - i,
        })),
      ],
    },
  }
  f.root.emit("autorouting:error", {
    ...f.phase,
    computeCost,
    error: { message: "router failed" },
  })

  const output = f.logs.join("\n")
  expect(output).toContain("router failed")
  expect(output).toContain("R2.pin2 -> U1.pin2 43.0% (71 iters)")
  expect(output).toContain("fallback-3 1.2% (2 iters)")
  expect(output).not.toContain("fallback-3 -> fallback-3")
  expect(output).not.toContain("fallback-4")
  expect(f.finalize()[0].computeCost.value).toBe(165)
})
