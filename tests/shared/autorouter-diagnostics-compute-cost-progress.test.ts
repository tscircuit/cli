import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("progress computeCostSummary is retained with PCB endpoint labels in the summary", async () => {
  const f = await getComputeCostTestFixture({ enabled: true })
  const unresolved = {
    ...f.computeCostSummary.topPairs[0]!,
    connectionName: "synthetic-connection",
    pcbPortIds: [null, "missing-port"],
  }
  const computeCostSummary = {
    ...f.computeCostSummary,
    topPairs: [...f.computeCostSummary.topPairs, unresolved],
  }
  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", { ...f.phase, computeCostSummary })
  f.root.emit("autorouting:end", f.phase)

  const [phase] = f.finalize()
  expect(phase.computeCostSummary).toEqual({
    ...computeCostSummary,
    topPairs: [
      { ...computeCostSummary.topPairs[0], labels: ["R2.pin2", "U1.pin2"] },
      {
        ...unresolved,
        labels: ["synthetic-connection", "synthetic-connection"],
      },
    ],
  })
  expect(f.logs.join("\n")).toContain(
    "hardest connections: R2.pin2 -> U1.pin2 (71 iters)",
  )
})
