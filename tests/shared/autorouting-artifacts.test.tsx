import { expect, test, spyOn } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { EventEmitter } from "node:events"
import type { AutoroutingPhaseProps } from "@tscircuit/props"
import { RootCircuit } from "tscircuit"
import { attachAutoroutingArtifacts } from "lib/shared/autorouting-artifacts"

const savedPaths = [
  {
    connection: "R1.1",
    route: [
      { route_type: "wire", x: -4.51, y: 0, layer: "top", width: 0.2 },
      { route_type: "wire", x: 3.49, y: 0, layer: "top", width: 0.2 },
    ],
  },
]
const event = {
  subcircuit_id: "subcircuit_0",
  routingPhaseIndex: 7,
  _actualRoutingPhaseOrderIndex: 0,
  phaseStageIndex: 0,
  pcbTracePaths: savedPaths,
}
const fixture = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "autorouting-artifacts-"))
  const root = new EventEmitter()
  const log = spyOn(console, "log").mockImplementation(() => {})
  const warn = spyOn(console, "warn").mockImplementation(() => {})
  const artifactDir = path.join(dir, ".tscircuit/autorouting-artifacts")
  const files = () =>
    fs.existsSync(artifactDir)
      ? fs
          .readdirSync(artifactDir, { recursive: true })
          .map(String)
          .filter((f) => f.endsWith(".json"))
          .map((f) => path.join(artifactDir, f))
      : []
  attachAutoroutingArtifacts(root, "board.tsx", dir)
  return {
    dir,
    root,
    log,
    warn,
    files,
    cleanup: () => {
      log.mockRestore()
      warn.mockRestore()
      fs.rmSync(dir, { recursive: true, force: true })
    },
  }
}

test("saves core paths verbatim without start events or access to live components", () => {
  const f = fixture()
  try {
    f.root.emit("autorouting:end", event)
    const file = f.files()[0]!
    expect(path.basename(file)).toBe(
      "subcircuit_0-phase-7-order-0-stage-0.pcb-trace-paths.json",
    )
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual(savedPaths)
    const oldTime = new Date("2020-01-01")
    fs.utimesSync(file, oldTime, oldTime)
    f.root.emit("autorouting:end", event)
    expect(fs.statSync(file).mtime.getTime()).toBe(oldTime.getTime())
    expect(f.log.mock.calls.flat().join("\n")).toContain("pcbTracePaths")
    expect(f.warn.mock.calls).toEqual([])
  } finally {
    f.cleanup()
  }
})

test("separates sparse declared phases, implicit fanouts, stages, and subcircuits", () => {
  const f = fixture()
  try {
    const phases = [
      event,
      { ...event, phaseStageIndex: 1, _actualRoutingPhaseOrderIndex: 1 },
      { ...event, routingPhaseIndex: 19, _actualRoutingPhaseOrderIndex: 2 },
      { ...event, routingPhaseIndex: null, _actualRoutingPhaseOrderIndex: 3 },
      { ...event, routingPhaseIndex: null, _actualRoutingPhaseOrderIndex: 4 },
      { ...event, subcircuit_id: "subcircuit_1" },
    ]
    for (const phase of phases) f.root.emit("autorouting:end", phase)
    expect(
      f
        .files()
        .map((f) => path.basename(f))
        .sort(),
    ).toEqual([
      "subcircuit_0-phase-19-order-2-stage-0.pcb-trace-paths.json",
      "subcircuit_0-phase-7-order-0-stage-0.pcb-trace-paths.json",
      "subcircuit_0-phase-7-order-1-stage-1.pcb-trace-paths.json",
      "subcircuit_0-phase-default-order-3-stage-0.pcb-trace-paths.json",
      "subcircuit_0-phase-default-order-4-stage-0.pcb-trace-paths.json",
      "subcircuit_1-phase-7-order-0-stage-0.pcb-trace-paths.json",
    ])
  } finally {
    f.cleanup()
  }
})

test("skips empty and failed phases and reports core's unsupported-output reason", () => {
  const f = fixture()
  try {
    f.root.emit("autorouting:error", event)
    f.root.emit("autorouting:end", { ...event, pcbTracePaths: [] })
    f.root.emit("autorouting:end", {
      ...event,
      pcbTracePaths: undefined,
      pcbTracePathsUnavailableReason: "Jumper segments cannot be replayed",
    })
    expect(f.files()).toEqual([])
    expect(f.warn.mock.calls.flat().join("\n")).toContain(
      "Jumper segments cannot be replayed",
    )
  } finally {
    f.cleanup()
  }
})

test("old runtimes warn once without attempting a private conversion", () => {
  const f = fixture()
  try {
    for (let i = 0; i < 2; i++)
      f.root.emit("autorouting:end", {
        ...event,
        pcbTracePaths: undefined,
        _actualRoutingPhaseOrderIndex: undefined,
      })
    expect(f.files()).toEqual([])
    expect(f.warn).toHaveBeenCalledTimes(1)
    expect(f.warn.mock.calls.flat().join("\n")).toContain(
      "update your project's tscircuit",
    )
  } finally {
    f.cleanup()
  }
})

test("artifact write failures remain warnings", () => {
  const f = fixture()
  try {
    fs.writeFileSync(path.join(f.dir, ".tscircuit"), "blocked")
    expect(() => f.root.emit("autorouting:end", event)).not.toThrow()
    expect(f.warn.mock.calls.flat().join("\n")).toContain(
      "Could not save autorouting paths",
    )
  } finally {
    f.cleanup()
  }
})

test("real core events save sparse phase paths that replay identical copper", async () => {
  const f = fixture()
  try {
    const board = (paths?: AutoroutingPhaseProps["pcbTracePaths"]) => (
      <board width={20} height={10} autorouter={{ local: true }}>
        <resistor name="R1" resistance="1k" footprint="0402" pcbX={-4} />
        <resistor name="R2" resistance="1k" footprint="0402" pcbX={4} />
        <trace from="R1.1" to="R2.1" routingPhaseIndex={19} />
        <autoroutingphase phaseIndex={19} pcbTracePaths={paths} />
      </board>
    )
    const circuit = new RootCircuit()
    attachAutoroutingArtifacts(circuit, "board.tsx", f.dir)
    circuit.add(board())
    await circuit.renderUntilSettled()
    expect(f.warn.mock.calls).toEqual([])
    expect(f.files()).toHaveLength(1)
    expect(path.basename(f.files()[0]!)).toContain("phase-19-order-0")
    const paths = JSON.parse(fs.readFileSync(f.files()[0]!, "utf8"))
    const replay = new RootCircuit()
    let solverStarts = 0
    replay.on("solver:started", ({ solverName }) => {
      if (solverName.includes("Autorouting")) solverStarts++
    })
    replay.add(board(paths))
    await replay.renderUntilSettled()
    expect(solverStarts).toBe(0)
    expect(replay.db.pcb_trace.list().map((t) => t.route)).toEqual(
      circuit.db.pcb_trace.list().map((t) => t.route),
    )
    expect(replay.db.pcb_autorouting_error.list()).toEqual([])
  } finally {
    f.cleanup()
  }
}, 30000)
