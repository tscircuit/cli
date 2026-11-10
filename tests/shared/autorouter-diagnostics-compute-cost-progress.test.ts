import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("progress computeCost is retained with PCB endpoint labels in the summary", async () => {
  const f = await getComputeCostTestFixture({ enabled: true })
  const unresolved = {
    ...f.computeCost.pairs[0]!,
    connectionName: "synthetic-connection",
    pcbPortIds: [null, "missing-port"],
  }
  const computeCost = {
    ...f.computeCost,
    pairs: [...f.computeCost.pairs, unresolved],
  }
  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", { ...f.phase, computeCost })
  f.root.emit("autorouting:end", f.phase)

  const [phase] = f.finalize()
  expect(phase.computeCost).toEqual({
    ...computeCost,
    pairs: [
      { ...computeCost.pairs[0], labels: ["R2.pin2", "U1.pin2"] },
      {
        ...unresolved,
        labels: ["synthetic-connection", "synthetic-connection"],
      },
    ],
  })
  expect(f.logs.join("\n")).toContain(
    "hardest connections: R2.pin2 -> U1.pin2 43.0% (71 iters)",
  )
})
