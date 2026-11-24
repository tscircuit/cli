import { expect, spyOn, test } from "bun:test"
import { withSpiceSimulationStatus } from "lib/shared/spice-simulation-status"

test("simulation status is logged before entering a blocking engine", async () => {
  const logs: string[] = []
  const result = { simulationResultCircuitJson: [] }
  const engine = {
    calls: 0,
    async simulate(spiceString: string) {
      expect(logs.join("\n")).toMatchInlineSnapshot(
        `"Running ngspice simulation..."`,
      )
      expect(spiceString).toBe("* original netlist\n.END")
      this.calls++
      const until = performance.now() + 20
      while (performance.now() < until) {}
      return result
    },
  }
  const engines = withSpiceSimulationStatus({ ngspice: engine }, (message) =>
    logs.push(message),
  )!

  expect(await engines.ngspice.simulate("* original netlist\n.END")).toBe(
    result,
  )
  expect(engine.calls).toBe(1)
  expect(logs).toHaveLength(1)
})

test("a quiet simulation reports elapsed time and clears its timer on completion", async () => {
  const logs: string[] = []
  const result = { simulationResultCircuitJson: [] }
  const pending = Promise.withResolvers<typeof result>()
  const clock = spyOn(performance, "now").mockReturnValue(1000)
  const intervals = spyOn(globalThis, "setInterval")
  const clear = spyOn(globalThis, "clearInterval")
  const engines = withSpiceSimulationStatus(
    { ngspice: { simulate: () => pending.promise } },
    (message) => logs.push(message),
  )!

  try {
    const simulation = engines.ngspice.simulate(".END")
    const [heartbeat, intervalMs] = intervals.mock.calls[0]
    expect(intervalMs).toBe(30_000)
    clock.mockReturnValue(31_000)
    heartbeat()
    clock.mockReturnValue(61_000)
    heartbeat()
    expect(logs.join("\n")).toMatchInlineSnapshot(`
      "Running ngspice simulation...
      Still running ngspice simulation (30s wall-clock elapsed)...
      Still running ngspice simulation (60s wall-clock elapsed)..."
    `)

    pending.resolve(result)
    expect(await simulation).toBe(result)
    expect(clear).toHaveBeenCalledWith(intervals.mock.results[0].value)
  } finally {
    pending.resolve({ simulationResultCircuitJson: [] })
    intervals.mockRestore()
    clear.mockRestore()
    clock.mockRestore()
  }
})

test("simulation errors are preserved and stop status updates", async () => {
  const error = new Error("simulator failed")
  const clear = spyOn(globalThis, "clearInterval")
  const engines = withSpiceSimulationStatus(
    {
      ngspice: {
        async simulate() {
          throw error
        },
      },
    },
    () => {},
  )!

  try {
    await expect(engines.ngspice.simulate(".END")).rejects.toBe(error)
    expect(clear).toHaveBeenCalledTimes(1)
  } finally {
    clear.mockRestore()
  }
})
