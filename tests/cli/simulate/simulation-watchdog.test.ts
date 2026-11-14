import { expect, test } from "bun:test"
import {
  createSimulationTimeoutError,
  runSimulationWithWatchdog,
} from "lib/eecircuit-engine/run-simulation-with-watchdog"
import type { ResultType } from "lib/types/eecircuit-engine"

test("snapshots the default solver timeout message", () => {
  expect(createSimulationTimeoutError()).toMatchInlineSnapshot(
    `[Error: Simulation timed out after 15 minutes]`,
  )
})

test("snapshots the timeout shown for a stalled solver", async () => {
  await expect(
    runSimulationWithWatchdog(
      {
        runSim: () => new Promise<ResultType>(() => {}),
        getError: () => [],
      },
      { timeoutMs: 1 },
    ),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Simulation timed out after 1 ms"`,
  )
})

test("snapshots fatal diagnostics when the solver never resolves", async () => {
  await expect(
    runSimulationWithWatchdog(
      {
        runSim: () => new Promise<ResultType>(() => {}),
        getError: () => [
          "Fatal error: instance v1 is a shorted VSRC",
          "run simulation(s) aborted",
        ],
      },
      { pollMs: 1 },
    ),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    "Fatal error: instance v1 is a shorted VSRC
    run simulation(s) aborted"
  `)
})
