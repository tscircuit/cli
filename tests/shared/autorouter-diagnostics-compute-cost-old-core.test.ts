import { expect, test } from "bun:test"
import { getComputeCostTestFixture } from "tests/fixtures/get-compute-cost-test-fixture"

test("old core events without computeCostSummary produce no computeCostSummary output or warnings", async () => {
  const fixture = await getComputeCostTestFixture({
    logOnError: true,
    timeoutMs: 1,
  })
  const phase = { subcircuit_id: fixture.phase.subcircuit_id }
  fixture.root.emit("autorouting:start", phase)
  fixture.root.emit("autorouting:progress", { ...phase, steps: 3 })
  fixture.root.emit("autorouting:end", phase)
  fixture.root.emit("autorouting:start", phase)
  fixture.root.emit("autorouting:progress", phase)
  fixture.root.emit("autorouting:error", {
    ...phase,
    error: { message: "expected failure" },
  })
  fixture.root.emit("autorouting:start", phase)
  fixture.root.emit("autorouting:progress", phase)
  await new Promise((resolve) => setTimeout(resolve, 5))
  expect(() => fixture.diagnostics.checkTimeout()).toThrow("Autorouter timeout")

  const phases = fixture.finalizeAndReadPhases()
  expect(phases).toHaveLength(2)
  expect(JSON.stringify(phases)).not.toContain("computeCostSummary")
  expect(
    JSON.stringify(fixture.readJson("phase-2.timeout.json")),
  ).not.toContain("computeCostSummary")
  expect(fixture.logs.join("\n")).not.toMatch(/hardest connections|Warning:/)
})
