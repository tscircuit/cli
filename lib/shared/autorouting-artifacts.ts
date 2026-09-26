import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import { layer_ref } from "circuit-json"

type Point = {
  x: number
  y: number
  route_type: "wire" | "via"
  layer?: string
  width?: number
  from_layer?: string
  to_layer?: string
  via_diameter?: number
  via_hole_diameter?: number
}
type Trace = { pcb_trace_id: string; route: Point[] }
type ConnectionPoint = {
  x: number
  y: number
  layer: string
  pcb_port_id?: string
}
type RoutingInput = {
  connections: { name: string; pointsToConnect: ConnectionPoint[] }[]
  traces?: Trace[]
}
type RoutingEvent = {
  subcircuit_id: string
  routingPhaseIndex?: number | null
  autorouterName?: string
  phaseName?: string
  phaseStageIndex?: number
  simpleRouteJson: RoutingInput
}

type SavedPath = { connection: string; route: Point[] }

const touches = (point: Point, endpoint: ConnectionPoint, end = false) =>
  Math.hypot(point.x - endpoint.x, point.y - endpoint.y) < 1e-4 &&
  (point.route_type === "wire"
    ? point.layer
    : end
      ? point.to_layer
      : point.from_layer) === endpoint.layer

/** Convert board-world routes back to the coordinate frame used by pcbTracePaths. */
export function convertToPcbTracePaths(
  input: RoutingInput,
  traces: Trace[],
  group: any,
  isFanout = false,
): SavedPath[] {
  const ports = new Map<string, any>(
    group.selectAll("port").map((port: any) => [port.pcb_port_id, port]),
  )
  const remaining = input.connections.map((connection) => ({
    ...connection,
    pointsToConnect: [...connection.pointsToConnect],
    covered: false,
  }))
  for (const trace of traces) {
    let layer: string | undefined
    for (const point of trace.route) {
      const fromLayer =
        point.route_type === "wire" ? point.layer : point.from_layer
      const toLayer = point.route_type === "wire" ? point.layer : point.to_layer
      if (
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        !layer_ref.safeParse(fromLayer).success ||
        !layer_ref.safeParse(toLayer).success ||
        (layer !== undefined && layer !== fromLayer) ||
        (point.route_type === "wire" &&
          !(Number.isFinite(point.width) && point.width! > 0)) ||
        [point.via_diameter, point.via_hole_diameter].some(
          (d) => d !== undefined && !(Number.isFinite(d) && d > 0),
        )
      ) {
        throw new Error("phase contains invalid wire/via geometry")
      }
      layer = toLayer
    }
  }
  const pending = [...traces]
  const paths: SavedPath[] = []
  const usedSelectors = new Set<string>()
  while (pending.length) {
    let matched = false
    for (const [traceIndex, trace] of pending.entries()) {
      if (
        trace.route.length < 2 ||
        trace.route.some((p) => !["wire", "via"].includes(p.route_type))
      ) {
        throw new Error("phase contains routes unsupported by pcbTracePaths")
      }
      for (const reverse of [false, true]) {
        const route = reverse
          ? trace.route
              .toReversed()
              .map((p) =>
                p.route_type === "via"
                  ? { ...p, from_layer: p.to_layer, to_layer: p.from_layer }
                  : p,
              )
          : trace.route
        const first = route[0]!
        const candidates = remaining.flatMap((connection) =>
          connection.pointsToConnect
            .filter((p) => p.pcb_port_id && touches(first, p))
            .map((point) => ({ connection, point })),
        )
        if (candidates.length !== 1) continue
        const { connection, point } = candidates[0]!
        // Peel off leaves first, so subsequent saved routes can still select
        // their starting port. Shared junctions without ports cannot be replayed.
        if (
          pending.some(
            (other) =>
              other !== trace &&
              (touches(other.route[0]!, point) ||
                touches(other.route.at(-1)!, point, true)),
          )
        )
          continue
        const end = route.at(-1)!
        if (
          !isFanout &&
          !connection.pointsToConnect.some(
            (p) => p !== point && touches(end, p, true),
          )
        )
          continue
        const port = ports.get(point.pcb_port_id!)
        if (!port) continue
        const selector = port.getPortSelector()
        if (
          usedSelectors.has(selector) ||
          group.selectOne(selector, { type: "port" }) !== port
        )
          continue
        const transform = group._computePcbGlobalTransformBeforeLayout()
        const before = port._getGlobalPcbPositionBeforeLayout()
        const after = port._getGlobalPcbPositionAfterLayout()
        const { a, b, c, d } = transform
        const determinant = a * d - b * c
        if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) {
          throw new Error("phase has a non-invertible PCB transform")
        }
        paths.push({
          connection: selector,
          route: route.map((p) => {
            const x = p.x - transform.e - (after.x - before.x)
            const y = p.y - transform.f - (after.y - before.y)
            const coordinates = {
              x: (d * x - c * y) / determinant,
              y: (-b * x + a * y) / determinant,
            }
            return p.route_type === "wire"
              ? {
                  route_type: "wire",
                  ...coordinates,
                  width: p.width,
                  layer: p.layer,
                }
              : {
                  route_type: "via",
                  ...coordinates,
                  from_layer: p.from_layer,
                  to_layer: p.to_layer,
                  ...(p.via_diameter !== undefined
                    ? { via_diameter: p.via_diameter }
                    : {}),
                  ...(p.via_hole_diameter !== undefined
                    ? { via_hole_diameter: p.via_hole_diameter }
                    : {}),
                }
          }),
        })
        usedSelectors.add(selector)
        connection.covered = true
        connection.pointsToConnect.splice(
          connection.pointsToConnect.indexOf(point),
          1,
        )
        pending.splice(traceIndex, 1)
        matched = true
        break
      }
      if (matched) break
    }
    if (!matched)
      throw new Error(
        "phase contains a route without a unique starting PCB port",
      )
  }
  if (
    remaining.some(
      (connection) =>
        !connection.covered ||
        (!isFanout && connection.pointsToConnect.length > 1),
    )
  ) {
    throw new Error(
      "saved routes would not cover every connection in the phase",
    )
  }
  return paths
}

/** One collector per render/entrypoint. Artifacts never change the circuit result. */
export function attachAutoroutingArtifacts(
  root: any,
  filePath: string,
  projectDir = process.cwd(),
) {
  const entryPath = path.relative(
    projectDir,
    path.resolve(projectDir, filePath),
  )
  const entryKey = `${path.basename(filePath).replace(/[^a-zA-Z0-9_-]/g, "-")}-${createHash("sha256").update(entryPath).digest("hex").slice(0, 10)}`
  const directory = path.resolve(
    projectDir,
    ".tscircuit",
    "autorouting-artifacts",
    entryKey,
  )
  const inputs = new Map<string, RoutingEvent>()
  const ordinals = new Map<string, number>()
  const key = (event: RoutingEvent) => event.subcircuit_id
  root.on("autorouting:error", (event: RoutingEvent) => {
    inputs.delete(key(event))
  })
  root.on("autorouting:start", (event: RoutingEvent) => {
    inputs.set(key(event), {
      ...event,
      simpleRouteJson: structuredClone(event.simpleRouteJson),
    })
  })
  root.on("autorouting:end", (event: RoutingEvent) => {
    const input = inputs.get(key(event))
    inputs.delete(key(event))
    const ordinal = ordinals.get(key(event)) ?? 0
    ordinals.set(key(event), ordinal + 1)
    try {
      if (!input) throw new Error("routing input was not provided")
      const findGroup = (children: any[]): any => {
        for (const child of children) {
          if (child.isGroup && child.subcircuit_id === event.subcircuit_id)
            return child
          const found = findGroup(child.children ?? [])
          if (found) return found
        }
      }
      const group = findGroup(root.children ?? [])
      if (!group) throw new Error("could not locate the phase's PCB group")
      const previous = new Map(
        (input.simpleRouteJson.traces ?? []).map((t) => [
          t.pcb_trace_id,
          JSON.stringify(t),
        ]),
      )
      const traces = (event.simpleRouteJson.traces ?? []).filter(
        (t) => previous.get(t.pcb_trace_id) !== JSON.stringify(t),
      )
      const phaseComponent = group
        .selectAll("autoroutingphase")
        .find(
          (phase: any) =>
            (phase._parsedProps.phaseIndex ?? null) ===
            (event.routingPhaseIndex ?? null),
        )
      const phaseAutorouter = phaseComponent?._parsedProps.autorouter
      const isFanout =
        input.autorouterName?.includes("fanout") ||
        (typeof phaseAutorouter === "string"
          ? phaseAutorouter
          : phaseAutorouter?.preset
        )?.includes("fanout") ||
        false
      const paths = convertToPcbTracePaths(
        input.simpleRouteJson,
        traces,
        phaseComponent?.getGroup() ?? group,
        isFanout,
      )
      if (!paths.length) return
      const phase =
        event.routingPhaseIndex === null
          ? "default"
          : (event.routingPhaseIndex ?? ordinal)
      const safeSubcircuit = event.subcircuit_id.replace(/[^a-zA-Z0-9_-]/g, "-")
      const stage =
        event.phaseStageIndex === undefined
          ? ""
          : `-stage-${event.phaseStageIndex}`
      const outputPath = path.join(
        directory,
        `${safeSubcircuit}-phase-${phase}${stage}.pcb-trace-paths.json`,
      )
      const contents = `${JSON.stringify(paths, null, 2)}\n`
      fs.mkdirSync(directory, { recursive: true })
      if (
        !fs.existsSync(outputPath) ||
        fs.readFileSync(outputPath, "utf8") !== contents
      ) {
        fs.writeFileSync(outputPath, contents)
      }
      console.log(
        `Saved autorouting paths to ${path.relative(projectDir, outputPath)} (import this JSON into <autoroutingphase pcbTracePaths={...} />).`,
      )
    } catch (error) {
      console.warn(
        `Could not save autorouting paths for ${event.subcircuit_id}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  })
}
