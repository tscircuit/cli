import { expect, test } from "bun:test"
import fs from "node:fs"
import { AutorouterPhaseTimeoutError } from "lib/shared/autorouter-diagnostics"
import { getRouteEffortTestFixture } from "tests/fixtures/get-route-effort-test-fixture"

test("effort formatting and artifact write failures warn without aborting routing", async () => {
  const f = await getRouteEffortTestFixture({ logOnError: true, timeoutMs: 1 })
  f.root.emit("autorouting:start", f.phase)
  expect(() =>
    f.root.emit("autorouting:error", {
      ...f.phase,
      routeEffort: { ...f.routeEffort, pairs: null },
    }),
  ).not.toThrow()
  expect(() => f.finalize()).not.toThrow()
  expect(f.logs.join("\n")).toContain(
    "Warning: Could not format autorouter route effort",
  )

  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", {
    ...f.phase,
    routeEffort: f.routeEffort,
  })
  expect(() => f.root.emit("autorouting:end", f.phase)).not.toThrow()
  fs.rmSync(f.debugDir, { recursive: true })
  fs.writeFileSync(f.debugDir, "blocked")
  expect(() => f.diagnostics.finalize()).not.toThrow()
  f.root.emit("autorouting:start", f.phase)
  f.root.emit("autorouting:progress", {
    ...f.phase,
    routeEffort: f.routeEffort,
  })
  await new Promise((resolve) => setTimeout(resolve, 5))
  expect(() => f.diagnostics.checkTimeout()).toThrow(
    AutorouterPhaseTimeoutError,
  )
  expect(f.logs.join("\n")).toContain(
    "Warning: Could not write autorouter debug artifact board.meta.json",
  )
  expect(f.logs.join("\n")).toContain(
    "Warning: Could not write autorouter debug artifact phase-2.timeout.json",
  )
})
