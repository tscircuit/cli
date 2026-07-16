import { describe, expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  AutorouterDiagnostics,
  AutorouterPhaseTimeoutError,
  parseAutorouterDumpSrjMode,
  parseAutorouterTimeout,
} from "lib/shared/autorouter-diagnostics"

class FakeRootCircuit extends EventEmitter {
  dbToArrayCallCount = 0

  constructor(
    private circuitJson: Array<Record<string, unknown>> = [
      {
        type: "pcb_board",
        pcb_board_id: "board_0",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        thickness: 1.4,
        num_layers: 2,
      },
    ],
  ) {
    super()
  }

  db = {
    toArray: () => {
      this.dbToArrayCallCount += 1
      return this.circuitJson
    },
  }
}

const makeTempDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "tsci-autorouter-diagnostics-"))

describe("autorouter diagnostics", () => {
  test("logs phase start/end and writes SRJ and PNG artifacts", async () => {
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
        traces: [
          {
            type: "pcb_trace",
            pcb_trace_id: "pcb_trace_0",
            source_trace_id: "source_trace_0",
            route: [
              {
                route_type: "wire",
                x: -2,
                y: 0,
                width: 0.2,
                layer: "top",
              },
              {
                route_type: "wire",
                x: 2,
                y: 0,
                width: 0.2,
                layer: "top",
              },
            ],
          },
        ],
        jumpers: [],
      },
    })
    expect(fs.existsSync(path.join(debugDir, "placement-unrouted.png"))).toBe(
      true,
    )
    expect(fs.existsSync(path.join(debugDir, "phase-0-routed.png"))).toBe(true)
    await diagnostics.finalize([])

    expect(logs.join("\n")).toContain("phase 1 start")
    expect(logs.join("\n")).toContain("connections=1")
    expect(logs.join("\n")).toContain("obstacles=1")
    expect(logs.join("\n")).toContain("phase 1 done")
    expect(logs).toContain(
      `Wrote debug artifact: ${path.relative(process.cwd(), path.join(debugDir, "placement-unrouted.png"))}`,
    )
    expect(logs).toContain(
      `Wrote debug artifact: ${path.relative(process.cwd(), path.join(debugDir, "phase-0-routed.png"))}`,
    )
    expect(
      fs.existsSync(path.join(debugDir, "phase-0.input.simple-route.json")),
    ).toBe(true)
    expect(
      fs.existsSync(path.join(debugDir, "phase-0.output.traces.json")),
    ).toBe(true)
    expect(fs.existsSync(path.join(debugDir, "board.meta.json"))).toBe(true)
    expect(
      fs
        .readFileSync(path.join(debugDir, "placement-unrouted.png"))
        .subarray(0, 8),
    ).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(
      fs.readFileSync(path.join(debugDir, "phase-0-routed.png")).subarray(0, 8),
    ).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(
      fs.readFileSync(path.join(debugDir, "phase-0-routed.png")),
    ).not.toEqual(
      fs.readFileSync(path.join(debugDir, "placement-unrouted.png")),
    )
  })

  test("logs selectors and names instead of circuit JSON ids", () => {
    const logs: string[] = []
    const debugDir = makeTempDir()
    const root = new FakeRootCircuit([
      {
        type: "pcb_board",
        pcb_board_id: "board_0",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        thickness: 1.4,
        num_layers: 2,
      },
      {
        type: "source_component",
        source_component_id: "source_component_0",
        name: "R1",
      },
      {
        type: "source_component",
        source_component_id: "source_component_1",
        name: "C1",
      },
      {
        type: "source_port",
        source_port_id: "source_port_0",
        source_component_id: "source_component_0",
        name: "pin1",
      },
      {
        type: "source_port",
        source_port_id: "source_port_1",
        source_component_id: "source_component_1",
        name: "pin2",
      },
      {
        type: "source_trace",
        source_trace_id: "source_trace_0",
        connected_source_port_ids: ["source_port_0", "source_port_1"],
        connected_source_net_ids: [],
      },
      {
        type: "source_trace",
        source_trace_id: "source_trace_1",
        name: "reset_filter",
        connected_source_port_ids: ["source_port_0", "source_port_1"],
        connected_source_net_ids: [],
      },
      {
        type: "source_net",
        source_net_id: "source_net_0",
        name: "GND",
      },
    ])
    const diagnostics = new AutorouterDiagnostics({
      enabled: true,
      debugDir,
      log: (message) => logs.push(message),
    })

    diagnostics.attachToRootCircuit(root)
    root.emit("autorouting:start", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board main",
      simpleRouteJson: {
        connections: [
          { name: "source_trace_0", source_trace_id: "source_trace_0" },
          { name: "source_trace_1", source_trace_id: "source_trace_1" },
          { name: "source_net_0" },
          { name: "source_port_0" },
        ],
      },
    })
    root.emit("autorouting:error", {
      subcircuit_id: "subcircuit_source_group_0",
      error: {
        message:
          "Could not route source_trace_0 inside subcircuit_source_group_0",
      },
    })

    const output = logs.join("\n")
    expect(output).toContain("R1.pin1 to C1.pin2")
    expect(output).toContain("reset_filter")
    expect(output).toContain("net.GND")
    expect(output).toContain("R1.pin1")
    expect(output).toContain(
      "Could not route R1.pin1 to C1.pin2 inside internal element",
    )
    expect(output).not.toMatch(
      /source_(?:trace|net|port|component)_\d+|subcircuit_source_group_\d+/,
    )
    expect(fs.existsSync(path.join(debugDir, "placement-unrouted.png"))).toBe(
      true,
    )
  })

  test("ignores empty ids and formats ids with a single database read", () => {
    const root = new FakeRootCircuit([
      {
        type: "pcb_board",
        pcb_board_id: "board_0",
      },
      {
        type: "source_trace",
        source_trace_id: "source_trace_1",
        name: "one",
      },
      {
        type: "source_trace",
        source_trace_id: "source_trace_10",
        name: "ten",
      },
      {
        type: "source_group",
        source_group_id: "",
      },
    ])
    const diagnostics = new AutorouterDiagnostics({ logOnError: true })
    diagnostics.attachToRootCircuit(root)

    const formatUserFacingText = (
      diagnostics as unknown as {
        formatUserFacingText: (value: string) => string
      }
    ).formatUserFacingText.bind(diagnostics)

    expect(
      formatUserFacingText(
        "source_trace_10 source_trace_1 board_0 subcircuit_missing_0",
      ),
    ).toBe("ten one internal element internal element")
    expect(root.dbToArrayCallCount).toBe(1)
  })

  test("phase timeout writes reproducer artifacts", async () => {
    const debugDir = makeTempDir()
    const root = new FakeRootCircuit()
    const diagnostics = new AutorouterDiagnostics({
      enabled: true,
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
    root.emit("autorouting:end", {
      subcircuit_id: "subcircuit_source_group_0",
      simpleRouteJson: {
        traces: [
          {
            type: "pcb_trace",
            pcb_trace_id: "pcb_trace_0",
            source_trace_id: "source_trace_0",
            route: [],
          },
        ],
      },
    })
    root.emit("autorouting:start", {
      subcircuit_id: "subcircuit_source_group_0",
      componentDisplayName: "board unnamedsubcircuit0",
      simpleRouteJson: {
        connections: [{ name: "GND" }],
        obstacles: [{ obstacleId: "pad_1" }],
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 5))

    expect(() => diagnostics.checkTimeout()).toThrow(
      AutorouterPhaseTimeoutError,
    )
    expect(fs.existsSync(path.join(debugDir, "phase-1.timeout.json"))).toBe(
      true,
    )
    expect(
      fs.existsSync(path.join(debugDir, "phase-1.input.simple-route.json")),
    ).toBe(true)
    expect(
      fs.existsSync(path.join(debugDir, "board.source-and-pcb.circuit.json")),
    ).toBe(true)
    expect(fs.existsSync(path.join(debugDir, "placement-unrouted.png"))).toBe(
      true,
    )
    expect(fs.existsSync(path.join(debugDir, "phase-0-routed.png"))).toBe(true)
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
