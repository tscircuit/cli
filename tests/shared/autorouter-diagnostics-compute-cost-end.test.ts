import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("end computeCost overrides progress with the computed ordinal fallback", async () => {
  const f = await getComputeCostTestFixture()
  const phase = { subcircuit_id: f.phase.subcircuit_id }
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:progress", { ...phase, computeCost: f.computeCost })
  f.root.emit("autorouting:end", {
    ...phase,
    computeCost: { ...f.computeCost, value: 200 },
  })
  f.root.emit("autorouting:start", phase)
  f.root.emit("autorouting:end", { ...phase, computeCost: f.computeCost })

  expect(f.finalize().map((p: any) => p.computeCost.value)).toEqual([200, 165])
  expect(f.logs.join("\n")).not.toContain("hardest connections:")
})
