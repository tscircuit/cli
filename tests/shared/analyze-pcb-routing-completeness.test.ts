import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { analyzePcbRoutingCompleteness } from "lib/shared/analyze-pcb-routing-completeness"

const getCircuitJson = ({
  includeRoute,
  includeInternalConnection = false,
}: {
  includeRoute: boolean
  includeInternalConnection?: boolean
}): AnyCircuitElement[] => {
  const circuitJson: any[] = [
    {
      type: "source_trace",
      source_trace_id: "source_trace_0",
      connected_source_port_ids: ["source_port_0", "source_port_1"],
      connected_source_net_ids: [],
      display_name: ".R1 > .pin2 to .R2 > .pin1",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      source_port_id: "source_port_0",
      pcb_component_id: "pcb_component_0",
      layers: ["top"],
      x: -5,
      y: 0,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      pcb_component_id: "pcb_component_1",
      layers: ["top"],
      x: 5,
      y: 0,
    },
  ]

  if (includeRoute) {
    circuitJson.push({
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_0",
      source_trace_id: "source_trace_0",
      route: [
        {
          route_type: "wire",
          x: -5,
          y: 0,
          width: 0.2,
          layer: "top",
          start_pcb_port_id: "pcb_port_0",
        },
        {
          route_type: "wire",
          x: 5,
          y: 0,
          width: 0.2,
          layer: "top",
          end_pcb_port_id: "pcb_port_1",
        },
      ],
    })
  }

  if (includeInternalConnection) {
    circuitJson.push({
      type: "source_component_internal_connection",
      source_component_internal_connection_id: "internal_connection_0",
      source_component_id: "source_component_0",
      source_port_ids: ["source_port_0", "source_port_1"],
    })
  }

  return circuitJson as AnyCircuitElement[]
}

test("reports a directly traced PCB net without copper as unrouted", () => {
  const result = analyzePcbRoutingCompleteness(
    getCircuitJson({ includeRoute: false }),
  )

  expect(result.checkedNetCount).toBe(1)
  expect(result.routedNetCount).toBe(0)
  expect(result.unroutedNets).toEqual([
    {
      label: ".R1 > .pin2 to .R2 > .pin1",
      sourcePortIds: ["source_port_0", "source_port_1"],
      pcbPortIds: ["pcb_port_0", "pcb_port_1"],
      disconnectedGroupCount: 2,
    },
  ])
})

test("accepts routed and internally connected PCB nets", () => {
  const routed = analyzePcbRoutingCompleteness(
    getCircuitJson({ includeRoute: true }),
  )
  const internallyConnected = analyzePcbRoutingCompleteness(
    getCircuitJson({
      includeRoute: false,
      includeInternalConnection: true,
    }),
  )

  expect(routed.routedNetCount).toBe(1)
  expect(routed.unroutedNets).toHaveLength(0)
  expect(internallyConnected.routedNetCount).toBe(1)
  expect(internallyConnected.unroutedNets).toHaveLength(0)
})

test("does not connect traces that cross on different PCB layers", () => {
  const circuitJson = getCircuitJson({ includeRoute: false }) as any[]
  circuitJson.push(
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_0",
      source_trace_id: "source_trace_0",
      route: [
        {
          route_type: "wire",
          x: -5,
          y: 0,
          width: 0.2,
          layer: "top",
          start_pcb_port_id: "pcb_port_0",
        },
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_1",
      source_trace_id: "source_trace_0",
      route: [
        {
          route_type: "wire",
          x: 0,
          y: -5,
          width: 0.2,
          layer: "bottom",
          start_pcb_port_id: "pcb_port_1",
        },
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "bottom" },
      ],
    },
  )

  const result = analyzePcbRoutingCompleteness(
    circuitJson as AnyCircuitElement[],
  )

  expect(result.unroutedNets).toHaveLength(1)
  expect(result.unroutedNets[0].disconnectedGroupCount).toBe(2)
})
