import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  AutorouterDiagnostics,
  type AutorouterDiagnosticsOptions,
} from "lib/shared/autorouter-diagnostics"
import { RootCircuit } from "tscircuit"

export const getRouteEffortTestFixture = async (
  options: AutorouterDiagnosticsOptions = {},
) => {
  const circuit = new RootCircuit()
  circuit.add(
    <board width={20} height={10} routingDisabled schematicDisabled>
      <resistor name="R2" resistance="1k" footprint="0402" pcbX={-4} />
      <resistor name="U1" resistance="1k" footprint="0402" pcbX={4} />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const portId = (name: string) => {
    const component = circuitJson.find(
      (e) => e.type === "source_component" && e.name === name,
    )
    if (component?.type !== "source_component") throw new Error(name)
    const port = circuitJson.find(
      (e) =>
        e.type === "source_port" &&
        e.source_component_id === component.source_component_id &&
        e.name === "pin2",
    )
    if (port?.type !== "source_port") throw new Error(`${name}.pin2`)
    const pcbPort = circuitJson.find(
      (e) => e.type === "pcb_port" && e.source_port_id === port.source_port_id,
    )
    if (pcbPort?.type !== "pcb_port") throw new Error(`${name} PCB port`)
    return pcbPort.pcb_port_id
  }
  const debugDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-route-effort-"))
  globalThis.deferredCleanupFns.push(async () => {
    fs.rmSync(debugDir, { recursive: true, force: true })
  })
  const logs: string[] = []
  const root = Object.assign(new EventEmitter(), { db: circuit.db })
  const diagnostics = new AutorouterDiagnostics({
    dumpSrj: "all",
    debugDir,
    log: (message) => logs.push(message),
    ...options,
  })
  diagnostics.attachToRootCircuit(root)
  const phase = {
    subcircuit_id: "subcircuit_a",
    _actualRoutingPhaseOrderIndex: 0,
  }
  const routeEffort = {
    metric: "solo_search_iterations" as const,
    totalIterations: 165,
    measuredPairCount: 10,
    pairs: [
      {
        connectionName: "merged-connection",
        rootConnectionNames: ["original-connection"],
        pcbPortIds: [portId("R2"), portId("U1")] as [string, string],
        iterations: 71,
        share: 71 / 165,
      },
    ],
  }
  const readJson = (name: string) =>
    JSON.parse(fs.readFileSync(path.join(debugDir, name), "utf8"))
  const finalize = () => {
    diagnostics.finalize(circuitJson)
    return readJson("board.meta.json").phases
  }
  return {
    root,
    diagnostics,
    debugDir,
    logs,
    phase,
    routeEffort,
    readJson,
    finalize,
  }
}
