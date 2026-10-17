import { expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import { attachRouteRemainingWarning } from "../../lib/shared/route-remaining-warning"

function setup() {
  const root = new EventEmitter()
  const logs: string[] = []
  let elapsedMs = 0
  const check = attachRouteRemainingWarning(
    root,
    (message) => logs.push(message),
    () => elapsedMs,
  )
  return {
    root,
    logs,
    check,
    advance: (ms: number) => {
      elapsedMs += ms
      check()
    },
  }
}

test("warns exactly once at 20 seconds for more than 30 default-phase traces", () => {
  const { root, logs, advance, check } = setup()
  root.emit("autorouting:start", {
    routingPhaseIndex: null,
    connectionCount: 31,
  })
  advance(19_999)
  expect(logs).toEqual([])
  advance(1)
  expect(logs).toEqual([
    "Routing 31 traces in a routeRemaining phase, try setting <board routeRemaining={false}> to incrementally route the board using <autoroutingphase /> directives",
  ])
  check()
  advance(20_000)
  expect(logs).toHaveLength(1)
})

test("ignores small, assigned, reroute, and unknown phases", () => {
  for (const event of [
    { routingPhaseIndex: null, connectionCount: 30 },
    { routingPhaseIndex: 0, connectionCount: 31 },
    { routingPhaseIndex: 2, connectionCount: 100 },
    { routingPhaseIndex: null, connectionCount: 31, isReroutePhase: true },
    { connectionCount: 31 },
  ]) {
    const { root, logs, advance } = setup()
    root.emit("autorouting:start", event)
    advance(20_000)
    expect(logs).toEqual([])
  }
})

test("does not warn after completion, failure, or render completion", () => {
  for (const event of [
    "autorouting:end",
    "autorouting:error",
    "renderComplete",
  ]) {
    const { root, logs, advance } = setup()
    root.emit("autorouting:start", {
      routingPhaseIndex: null,
      connectionCount: 31,
    })
    advance(19_999)
    root.emit(event, {})
    advance(1)
    expect(logs).toEqual([])
  }
})

test("tracks concurrent subcircuits and resets the elapsed time for new phases", () => {
  const { root, logs, advance } = setup()
  const start = (subcircuit_id: string) =>
    root.emit("autorouting:start", {
      subcircuit_id,
      routingPhaseIndex: null,
      simpleRouteJson: { connections: Array.from({ length: 32 }, () => ({})) },
    })
  start("a")
  start("b")
  advance(10_000)
  root.emit("autorouting:end", { subcircuit_id: "a" })
  start("a")
  advance(10_000)
  expect(logs).toHaveLength(1)
  advance(10_000)
  expect(logs).toHaveLength(2)
  expect(logs.every((message) => message.startsWith("Routing 32 traces"))).toBe(
    true,
  )
})

test("an assigned phase replaces the pending default phase for its subcircuit", () => {
  const { root, logs, advance } = setup()
  root.emit("autorouting:start", {
    subcircuitId: "a",
    routingPhaseIndex: null,
    connectionCount: 31,
  })
  advance(10_000)
  root.emit("autorouting:start", {
    subcircuitId: "a",
    routingPhaseIndex: 0,
    connectionCount: 31,
  })
  advance(20_000)
  expect(logs).toEqual([])
})
