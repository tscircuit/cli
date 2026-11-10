import { expect, test } from "bun:test"
import { getRouteEffortTestFixture } from "tests/fixtures/get-route-effort-test-fixture"

test("progress effort is retained with PCB endpoint labels in the summary", async () => {
  const f = await getRouteEffortTestFixture({ enabled: true })
  const unresolved = {
    ...f.routeEffort.pairs[0]!,
    connectionName: "synthetic-connection",
    pcbPortIds: [null, "missing-port"],
  }
  const routeEffort = {
    ...f.routeEffort,
    pairs: [...f.routeEffort.pairs, unresolved],
  }
  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", { ...f.phase, routeEffort })
  f.root.emit("autorouting:end", f.phase)

  const [phase] = f.finalize()
  expect(phase.routeEffort).toEqual({
    ...routeEffort,
    pairs: [
      { ...routeEffort.pairs[0], labels: ["R2.pin2", "U1.pin2"] },
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
