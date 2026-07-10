import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import {
  AutorouterDiagnostics,
  AutorouterPhaseTimeoutError,
  parseAutorouterDumpSrjMode,
  parseAutorouterTimeout,
} from "lib/shared/autorouter-diagnostics"

class FakeRootCircuit extends EventEmitter {
  db = {
    toArray: () => [{ type: "pcb_board", pcb_board_id: "board_0" }],
  }
}

const makeTempDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "tsci-autorouter-diagnostics-"))

describe("autorouter diagnostics", () => {
  test("logs phase start/end and writes SRJ artifacts", () => {
    const debugDir = makeTempDir()
    const logs: string[] = []
    const root = new FakeRootCircuit()
    const diagnostics = new AutorouterDiagnostics({
      enabled: true,
      dumpSrj: "all",
      debugDir,
      log: (message) => logs.push(message),
    })

    diagnostics.attachToRootCircuit(root)
    root.emit("autorouting:start", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board unnamedsubcircuit0",
      simpleRouteJson: {
        connections: [{ name: "GND" }],
        obstacles: [{ obstacleId: "pad_1" }],
      },
    })
    root.emit("autorouting:end", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board unnamedsubcircuit0",
      simpleRouteJson: {
        traces: [{ route: [] }],
        jumpers: [],
      },
    })
    diagnostics.finalize([])

    expect(logs.join("\n")).toContain("phase 1 start")
    expect(logs.join("\n")).toContain("connections=1")
    expect(logs.join("\n")).toContain("obstacles=1")
    expect(logs.join("\n")).toContain("phase 1 done")
    expect(
      fs.existsSync(path.join(debugDir, "phase-0.input.simple-route.json")),
    ).toBe(true)
    expect(
      fs.existsSync(path.join(debugDir, "phase-0.output.traces.json")),
    ).toBe(true)
    expect(fs.existsSync(path.join(debugDir, "board.meta.json"))).toBe(true)
  })

  test("phase timeout writes reproducer artifacts", async () => {
    const debugDir = makeTempDir()
    const root = new FakeRootCircuit()
    const diagnostics = new AutorouterDiagnostics({
      timeoutMs: 1,
      dumpSrj: "failed",
      debugDir,
      log: () => {},
    })

    diagnostics.attachToRootCircuit(root)
    root.emit("autorouting:start", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board unnamedsubcircuit0",
      simpleRouteJson: {
        connections: [{ name: "VBUS_5V" }],
        obstacles: [{ obstacleId: "pad_1" }],
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 5))

    expect(() => diagnostics.checkTimeout()).toThrow(
      AutorouterPhaseTimeoutError,
    )
    expect(fs.existsSync(path.join(debugDir, "phase-0.timeout.json"))).toBe(
      true,
    )
    expect(
      fs.existsSync(path.join(debugDir, "phase-0.input.simple-route.json")),
    ).toBe(true)
    expect(
      fs.existsSync(path.join(debugDir, "board.source-and-pcb.circuit.json")),
    ).toBe(true)
  })

  test("parses autorouter flag values", () => {
    expect(parseAutorouterTimeout("120s")).toBe(120_000)
    expect(parseAutorouterTimeout("2m")).toBe(120_000)
    expect(parseAutorouterTimeout("5000")).toBe(5_000)
    expect(parseAutorouterDumpSrjMode(true)).toBe("failed")
    expect(parseAutorouterDumpSrjMode("all")).toBe("all")
    expect(parseAutorouterDumpSrjMode("phase:3")).toBe("phase:3")
  })

  test("quiet diagnostics do not log fast successful phases", () => {
    const logs: string[] = []
    const root = new FakeRootCircuit()
    const diagnostics = new AutorouterDiagnostics({
      logOnError: true,
      longRunningLogThresholdMs: 10_000,
      log: (message) => logs.push(message),
    })

    diagnostics.attachToRootCircuit(root)
    root.emit("autorouting:start", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board unnamedsubcircuit0",
      simpleRouteJson: {
        connections: [{ name: "GND" }],
        obstacles: [{ obstacleId: "pad_1" }],
      },
    })
    root.emit("autorouting:end", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board unnamedsubcircuit0",
      simpleRouteJson: { traces: [{ route: [] }] },
    })

    expect(logs).toEqual([])
  })

  test("quiet diagnostics begin logging long-running phases", async () => {
    const logs: string[] = []
    const root = new FakeRootCircuit()
    const diagnostics = new AutorouterDiagnostics({
      longRunningLogThresholdMs: 1,
      log: (message) => logs.push(message),
    })

    diagnostics.attachToRootCircuit(root)
    root.emit("autorouting:start", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board unnamedsubcircuit0",
      simpleRouteJson: {
        connections: [{ name: "VBUS_5V" }],
        obstacles: [{ obstacleId: "pad_1" }],
      },
    })
    root.emit("autorouting:progress", {
      subcircuit_id: "subcircuit_source_group_0",
      phase: "capacity-depth",
      steps: 12,
      progress: 0.25,
    })

    await new Promise((resolve) => setTimeout(resolve, 5))
    diagnostics.checkTimeout()

    const output = logs.join("\n")
    expect(output).toContain("has been running")
    expect(output).toContain("--autorouter-debug")
    expect(output).toContain("connections=1")
    expect(output).toContain("obstacles=1")
    expect(output).toContain("progress=25%")
  })

  test("quiet diagnostics log phase context on autorouter errors", () => {
    const logs: string[] = []
    const root = new FakeRootCircuit()
    const diagnostics = new AutorouterDiagnostics({
      logOnError: true,
      log: (message) => logs.push(message),
    })

    diagnostics.attachToRootCircuit(root)
    root.emit("autorouting:start", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board unnamedsubcircuit0",
      simpleRouteJson: {
        connections: [{ name: "GND" }, { name: "VBUS" }],
        obstacles: [{ obstacleId: "pad_1" }],
      },
    })
    root.emit("autorouting:error", {
      subcircuit_id: "subcircuit_source_group_0",
      error: { message: "router failed" },
    })

    const output = logs.join("\n")
    expect(output).toContain("failed start")
    expect(output).toContain("connections=2")
    expect(output).toContain("router failed")
  })
})
