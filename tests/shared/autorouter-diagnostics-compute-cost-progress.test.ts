import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("progress computeCostSummary is retained with PCB endpoint labels in the summary", async () => {
  const fixture = await getComputeCostTestFixture({ enabled: true })
  const unresolved = {
    ...fixture.computeCostSummary.topPairs[0]!,
    connectionName: "synthetic-connection",
    pcbPortIds: [null, "missing-port"],
  }
  const computeCostSummary = {
    ...fixture.computeCostSummary,
    topPairs: [...fixture.computeCostSummary.topPairs, unresolved],
  }
  fixture.root.emit("autorouting:start", fixture.phase)
  fixture.root.emit("autorouting:progress", {
    ...fixture.phase,
    computeCostSummary,
  })
  fixture.root.emit("autorouting:end", fixture.phase)

  const [phase] = fixture.finalizeAndReadPhases()
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
  expect(fixture.logs.join("\n")).toContain(
    "hardest connections: R2.pin2 -> U1.pin2 (71 iters)",
  )
})
