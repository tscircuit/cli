import type { AnyCircuitElement } from "circuit-json"
import {
  getSourcePortConnectivityMapFromCircuitJson,
  PcbConnectivityMap,
} from "circuit-json-to-connectivity-map"

export type UnroutedPcbNet = {
  label: string
  sourcePortIds: string[]
  pcbPortIds: string[]
  disconnectedGroupCount: number
}

export type PcbRoutingCompleteness = {
  checkedNetCount: number
  routedNetCount: number
  unroutedNets: UnroutedPcbNet[]
}

const unique = <T>(values: T[]): T[] => [...new Set(values)]

const PCB_LAYER_OFFSETS: Record<string, number> = {
  top: 0,
  inner1: 1,
  inner2: 2,
  inner3: 3,
  inner4: 4,
  inner5: 5,
  inner6: 6,
  inner7: 7,
  inner8: 8,
  bottom: 9,
}

const separatePcbTraceLayers = (
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] =>
  circuitJson.map((element) => {
    if (element.type !== "pcb_trace") return element

    return {
      ...element,
      route: element.route.map((routePoint) =>
        routePoint.route_type === "wire"
          ? {
              ...routePoint,
              y:
                routePoint.y +
                (PCB_LAYER_OFFSETS[routePoint.layer] ?? 0) * 1_000_000,
            }
          : routePoint,
      ),
    }
  })

export const analyzePcbRoutingCompleteness = (
  circuitJson: AnyCircuitElement[],
): PcbRoutingCompleteness => {
  const sourceTraces = circuitJson.filter(
    (element) => element.type === "source_trace",
  )
  const sourceNetsById = new Map(
    circuitJson
      .filter((element) => element.type === "source_net")
      .map((sourceNet) => [sourceNet.source_net_id, sourceNet]),
  )
  const directlyTracedSourcePortIds = new Set(
    sourceTraces.flatMap((trace) => trace.connected_source_port_ids ?? []),
  )
  const sourcePortToPcbPortIds = new Map<string, string[]>()

  for (const element of circuitJson) {
    if (element.type !== "pcb_port" || !element.source_port_id) continue
    const pcbPortIds = sourcePortToPcbPortIds.get(element.source_port_id) ?? []
    pcbPortIds.push(element.pcb_port_id)
    sourcePortToPcbPortIds.set(element.source_port_id, pcbPortIds)
  }

  const expectedConnectivity =
    getSourcePortConnectivityMapFromCircuitJson(circuitJson)
  // PcbConnectivityMap detects geometric trace intersections without checking
  // layers. Separate layer coordinates before analysis so an ordinary
  // top/bottom crossing is not mistaken for a copper connection.
  const pcbConnectivity = new PcbConnectivityMap(
    separatePcbTraceLayers(circuitJson),
  )

  // PCB ports that are electrically joined inside a component do not require
  // an external copper connection, so include those links in the physical map.
  for (const element of circuitJson) {
    const internalSourcePortGroups =
      element.type === "source_component"
        ? (element.internally_connected_source_port_ids ?? [])
        : element.type === "source_component_internal_connection"
          ? [element.source_port_ids]
          : []

    for (const sourcePortGroup of internalSourcePortGroups) {
      const pcbPortIds = unique(
        sourcePortGroup.flatMap(
          (sourcePortId) => sourcePortToPcbPortIds.get(sourcePortId) ?? [],
        ),
      )
      if (pcbPortIds.length > 1) {
        pcbConnectivity.connMap.addConnections([pcbPortIds])
      }
    }
  }

  const unroutedNets: UnroutedPcbNet[] = []
  let checkedNetCount = 0

  for (const expectedIds of Object.values(expectedConnectivity.netMap)) {
    // Internal-only component ports are intentionally omitted. A PCB net is
    // only required for ports that participate directly in a source trace.
    const sourcePortIds = unique(
      expectedIds.filter(
        (id) =>
          directlyTracedSourcePortIds.has(id) && sourcePortToPcbPortIds.has(id),
      ),
    )
    const pcbPortIds = unique(
      sourcePortIds.flatMap(
        (sourcePortId) => sourcePortToPcbPortIds.get(sourcePortId) ?? [],
      ),
    )

    if (pcbPortIds.length < 2) continue
    checkedNetCount += 1

    const physicalGroups = new Set(
      pcbPortIds.map(
        (pcbPortId) =>
          pcbConnectivity.connMap.getNetConnectedToId(pcbPortId) ??
          `unconnected:${pcbPortId}`,
      ),
    )
    if (physicalGroups.size <= 1) continue

    const sourceNetNames = expectedIds.flatMap((id) => {
      const sourceNet = sourceNetsById.get(id)
      return sourceNet?.name ? [sourceNet.name] : []
    })
    const sourcePortIdSet = new Set(sourcePortIds)
    const representativeTrace = sourceTraces.find((trace) =>
      trace.connected_source_port_ids?.some((sourcePortId) =>
        sourcePortIdSet.has(sourcePortId),
      ),
    )
    const label =
      sourceNetNames.length > 0
        ? sourceNetNames.map((name) => `net.${name}`).join(", ")
        : (representativeTrace?.display_name ??
          representativeTrace?.name ??
          representativeTrace?.source_trace_id ??
          "unnamed net")

    unroutedNets.push({
      label,
      sourcePortIds,
      pcbPortIds,
      disconnectedGroupCount: physicalGroups.size,
    })
  }

  return {
    checkedNetCount,
    routedNetCount: checkedNetCount - unroutedNets.length,
    unroutedNets,
  }
}
