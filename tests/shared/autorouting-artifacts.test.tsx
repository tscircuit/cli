import { expect, test, spyOn } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { EventEmitter } from "node:events"
import { RootCircuit } from "tscircuit"
import {
  attachAutoroutingArtifacts,
  convertToPcbTracePaths,
} from "lib/shared/autorouting-artifacts"

const wire = (x: number, y = 0, layer = "top") => ({
  route_type: "wire" as const,
  x,
  y,
  layer,
  width: 0.2,
})
const endpoint = (id: string, x: number, layer = "top") => ({
  pcb_port_id: id,
  x,
  y: 0,
  layer,
})
const input = {
  connections: [
    { name: "signal", pointsToConnect: [endpoint("a", 0), endpoint("b", 4)] },
  ],
}
const makeGroup = (transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) => {
  const ports = ["a", "b", "c"].map((id) => ({
    pcb_port_id: id,
    getPortSelector: () => `U${id}.1`,
    _getGlobalPcbPositionBeforeLayout: () => ({ x: 0, y: 0 }),
    _getGlobalPcbPositionAfterLayout: () => ({ x: 0, y: 0 }),
  }))
  return {
    selectAll: () => ports,
    selectOne: (selector: string) =>
      ports.find((p) => p.getPortSelector() === selector),
    _computePcbGlobalTransformBeforeLayout: () => transform,
  }
}

test("converts port selectors and inverse group placement, retaining physical layers", () => {
  const result = convertToPcbTracePaths(
    input,
    [{ pcb_trace_id: "t", route: [wire(0), wire(4)] }],
    makeGroup({ a: 0, b: 1, c: -1, d: 0, e: 10, f: 20 }),
  )
  expect(result).toEqual([
    { connection: "Ua.1", route: [wire(-20, 10), wire(-20, 6)] },
  ])
})

test("orients fanout escapes from their port and reverses via layer transitions", () => {
  const result = convertToPcbTracePaths(
    { connections: [{ name: "signal", pointsToConnect: [endpoint("a", 0)] }] },
    [
      {
        pcb_trace_id: "t",
        route: [
          wire(3, 0, "bottom"),
          {
            route_type: "via",
            x: 1,
            y: 0,
            from_layer: "bottom",
            to_layer: "top",
            via_diameter: 0.6,
            via_hole_diameter: 0.3,
          },
          wire(0),
        ],
      },
    ],
    makeGroup(),
    true,
  )
  expect(result[0]?.connection).toBe("Ua.1")
  expect(result[0]?.route[1]).toMatchObject({
    from_layer: "top",
    to_layer: "bottom",
    via_diameter: 0.6,
    via_hole_diameter: 0.3,
  })
  expect(result[0]?.route[0]).toEqual(wire(0))
})

test("orders a multi-terminal tree from leaves so each saved starting port remains available", () => {
  const multi = {
    connections: [
      {
        name: "net",
        pointsToConnect: [endpoint("a", 0), endpoint("b", 4), endpoint("c", 8)],
      },
    ],
  }
  const result = convertToPcbTracePaths(
    multi,
    [
      { pcb_trace_id: "t1", route: [wire(4), wire(8)] },
      { pcb_trace_id: "t2", route: [wire(0), wire(4)] },
    ],
    makeGroup(),
  )
  expect(result.map((p) => p.connection)).toEqual(["Uc.1", "Ua.1"])
})

test("rejects partial coverage and non-port junctions instead of exporting invalid paths", () => {
  expect(() => convertToPcbTracePaths(input, [], makeGroup())).toThrow(
    "cover every connection",
  )
  expect(() =>
    convertToPcbTracePaths(
      input,
      [{ pcb_trace_id: "t", route: [wire(0), wire(2)] }],
      makeGroup(),
    ),
  ).toThrow("unique starting PCB port")
})

test("a real render writes directly importable JSON and reports its location", async () => {
  const cwd = process.cwd()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "autorouting-artifacts-"))
  const log = spyOn(console, "log").mockImplementation(() => {})
  const warn = spyOn(console, "warn").mockImplementation(() => {})
  try {
    process.chdir(dir)
    const circuit = new RootCircuit()
    attachAutoroutingArtifacts(circuit, "board.tsx")
    circuit.add(
      <board width={20} height={10} autorouter={{ local: true }}>
        <resistor name="R1" resistance="1k" footprint="0402" pcbX={-4} />
        <resistor name="R2" resistance="1k" footprint="0402" pcbX={4} />
        <trace from="R1.1" to="R2.1" />
      </board>,
    )
    await circuit.renderUntilSettled()
    expect(warn.mock.calls).toEqual([])
    const files = fs
      .readdirSync(".tscircuit/autorouting-artifacts", { recursive: true })
      .filter((f) => String(f).endsWith(".json"))
    expect(files).toHaveLength(1)
    const saved = JSON.parse(
      fs.readFileSync(
        path.join(".tscircuit/autorouting-artifacts", String(files[0])),
        "utf8",
      ),
    )
    expect(saved).toHaveLength(1)
    expect(saved[0].connection).toContain("R")
    expect(saved[0].route.length).toBeGreaterThan(1)
    expect(log.mock.calls.flat().join("\n")).toContain("pcbTracePaths")
  } finally {
    process.chdir(cwd)
    log.mockRestore()
    warn.mockRestore()
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 30_000)

test("captures phase inputs, excludes unchanged earlier routes, and does not save failed phases", () => {
  const cwd = process.cwd()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "autorouting-events-"))
  const log = spyOn(console, "log").mockImplementation(() => {})
  const warn = spyOn(console, "warn").mockImplementation(() => {})
  try {
    process.chdir(dir)
    const group = makeGroup()
    const root = Object.assign(new EventEmitter(), {
      children: [
        {
          ...group,
          isGroup: true,
          subcircuit_id: "subcircuit_0",
          selectAll: (selector: string) =>
            selector === "port" ? group.selectAll() : [],
        },
      ],
    })
    attachAutoroutingArtifacts(root, "board.tsx")
    const previous = { pcb_trace_id: "old", route: [wire(10), wire(12)] }
    const event = {
      subcircuit_id: "subcircuit_0",
      routingPhaseIndex: 7,
      simpleRouteJson: { ...input, traces: [previous] },
    }
    root.emit("autorouting:start", event)
    // A producer is allowed to mutate its output; the start snapshot is independent.
    event.simpleRouteJson.traces.push({
      pcb_trace_id: "new",
      route: [wire(0), wire(4)],
    })
    root.emit("autorouting:end", event)
    root.emit("autorouting:start", { ...event, routingPhaseIndex: 8 })
    root.emit("autorouting:error", { ...event, routingPhaseIndex: 8 })
    const entry = fs.readdirSync(".tscircuit/autorouting-artifacts")[0]!
    const files = fs.readdirSync(
      path.join(".tscircuit/autorouting-artifacts", entry),
    )
    expect(files).toEqual(["subcircuit_0-phase-7.pcb-trace-paths.json"])
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(".tscircuit/autorouting-artifacts", entry, files[0]!),
          "utf8",
        ),
      ),
    ).toEqual([{ connection: "Ua.1", route: [wire(0), wire(4)] }])
    expect(warn.mock.calls).toEqual([])
  } finally {
    process.chdir(cwd)
    log.mockRestore()
    warn.mockRestore()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
