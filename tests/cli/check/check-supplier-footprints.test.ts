import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { checkSupplierFootprintsInCircuitJson } from "cli/check/supplier-footprints/register"
import { compareSupplierFootprint } from "cli/check/supplier-footprints/compare-footprints"

const makeFootprint = ({
  componentId,
  sourceComponentId,
  rotation = 0,
  x = 0,
  y = 0,
  pins = [
    { pin: 1, x: -1, y: 0 },
    { pin: 2, x: 1, y: 0 },
  ],
}: {
  componentId: string
  sourceComponentId: string
  rotation?: number
  x?: number
  y?: number
  pins?: Array<{ pin: number; x: number; y: number; width?: number }>
}): AnyCircuitElement[] => {
  const angle = (rotation * Math.PI) / 180
  const rotate = (point: { x: number; y: number }) => ({
    x: x + point.x * Math.cos(angle) - point.y * Math.sin(angle),
    y: y + point.x * Math.sin(angle) + point.y * Math.cos(angle),
  })

  return [
    {
      type: "source_component",
      source_component_id: sourceComponentId,
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "pcb_component",
      pcb_component_id: componentId,
      source_component_id: sourceComponentId,
      center: { x, y },
      width: 3,
      height: 2,
      layer: "top",
      rotation,
    },
    ...pins.flatMap((pin, index) => {
      const position = rotate(pin)
      const sourcePortId = `${sourceComponentId}_port_${pin.pin}`
      const pcbPortId = `${componentId}_port_${pin.pin}`
      return [
        {
          type: "source_port",
          source_port_id: sourcePortId,
          source_component_id: sourceComponentId,
          name: `pin${pin.pin}`,
          pin_number: pin.pin,
          port_hints: [],
        },
        {
          type: "pcb_port",
          pcb_port_id: pcbPortId,
          source_port_id: sourcePortId,
          pcb_component_id: componentId,
          x: position.x,
          y: position.y,
          layers: ["top"],
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: `${componentId}_pad_${index}`,
          pcb_component_id: componentId,
          pcb_port_id: pcbPortId,
          x: position.x,
          y: position.y,
          width: rotation % 180 === 90 ? 0.6 : (pin.width ?? 0.8),
          height: rotation % 180 === 90 ? (pin.width ?? 0.8) : 0.6,
          layer: "top",
          shape: "rect",
          port_hints: [`pin${pin.pin}`],
        },
      ]
    }),
  ] as AnyCircuitElement[]
}

test("supplier footprint comparison accepts translated and rotated placement", () => {
  const supplier = makeFootprint({
    componentId: "supplier_component",
    sourceComponentId: "supplier_source",
  })
  const local = makeFootprint({
    componentId: "local_component",
    sourceComponentId: "local_source",
    rotation: 90,
    x: 12,
    y: -4,
  })

  const result = compareSupplierFootprint({
    localCircuitJson: local,
    localPcbComponentId: "local_component",
    supplierCircuitJson: supplier,
  })

  expect(result.matches).toBeTrue()
  expect(result.mismatches).toEqual([])
})

test("supplier footprint comparison catches swapped physical pad numbers", () => {
  const supplier = makeFootprint({
    componentId: "supplier_component",
    sourceComponentId: "supplier_source",
  })
  const local = makeFootprint({
    componentId: "local_component",
    sourceComponentId: "local_source",
    pins: [
      { pin: 1, x: 1, y: 0 },
      { pin: 2, x: -1, y: 0 },
    ],
  })

  const result = compareSupplierFootprint({
    localCircuitJson: local,
    localPcbComponentId: "local_component",
    supplierCircuitJson: supplier,
  })

  expect(result.matches).toBeFalse()
  expect(result.mismatches.map(({ message }) => message).join("\n")).toContain(
    "pin 1 mismatch",
  )
})

test("supplier footprint comparison catches pad geometry differences", () => {
  const supplier = makeFootprint({
    componentId: "supplier_component",
    sourceComponentId: "supplier_source",
  })
  const local = makeFootprint({
    componentId: "local_component",
    sourceComponentId: "local_source",
    pins: [
      { pin: 1, x: -1, y: 0, width: 1.2 },
      { pin: 2, x: 1, y: 0 },
    ],
  })

  const result = compareSupplierFootprint({
    localCircuitJson: local,
    localPcbComponentId: "local_component",
    supplierCircuitJson: supplier,
  })

  expect(result.matches).toBeFalse()
  expect(result.mismatches.map(({ message }) => message).join("\n")).toContain(
    "width 1.2 != 0.8",
  )
})

test("supplier footprint comparison treats a fully rounded square pad as a circle", () => {
  const supplier = makeFootprint({
    componentId: "supplier_component",
    sourceComponentId: "supplier_source",
  }) as Array<AnyCircuitElement & Record<string, unknown>>
  const local = makeFootprint({
    componentId: "local_component",
    sourceComponentId: "local_source",
  }) as Array<AnyCircuitElement & Record<string, unknown>>

  for (const element of supplier) {
    if (element.type !== "pcb_smtpad") continue
    const pad = element as Record<string, unknown>
    pad.type = "pcb_plated_hole"
    pad.shape = "circle"
    pad.outer_diameter = 0.8
    pad.hole_diameter = 0.5
    pad.layers = ["top", "bottom"]
    delete pad.width
    delete pad.height
    delete pad.layer
  }
  for (const element of local) {
    if (element.type !== "pcb_smtpad") continue
    const pad = element as Record<string, unknown>
    pad.type = "pcb_plated_hole"
    pad.shape = "circular_hole_with_rect_pad"
    pad.hole_shape = "circle"
    pad.pad_shape = "rect"
    pad.hole_diameter = 0.5
    pad.rect_pad_width = 0.8
    pad.rect_pad_height = 0.8
    pad.rect_border_radius = 0.4
    pad.hole_offset_x = 0
    pad.hole_offset_y = 0
    pad.layers = ["top", "bottom"]
    delete pad.width
    delete pad.height
    delete pad.layer
  }

  const result = compareSupplierFootprint({
    localCircuitJson: local,
    localPcbComponentId: "local_component",
    supplierCircuitJson: supplier,
  })

  expect(result.matches).toBeTrue()
})

test("supplier footprint comparison normalizes a rotated pill hole with rect pad", () => {
  const supplier = makeFootprint({
    componentId: "supplier_component",
    sourceComponentId: "supplier_source",
  }) as Array<AnyCircuitElement & Record<string, unknown>>
  const local = makeFootprint({
    componentId: "local_component",
    sourceComponentId: "local_source",
    rotation: 90,
    x: 5,
    y: 7,
  }) as Array<AnyCircuitElement & Record<string, unknown>>

  for (const element of supplier) {
    if (element.type !== "pcb_smtpad") continue
    const pad = element as Record<string, unknown>
    pad.type = "pcb_plated_hole"
    pad.shape = "pill_hole_with_rect_pad"
    pad.hole_shape = "pill"
    pad.pad_shape = "rect"
    pad.hole_width = 0.5
    pad.hole_height = 1
    pad.rect_pad_width = 0.8
    pad.rect_pad_height = 1.3
    pad.hole_offset_x = 0
    pad.hole_offset_y = 0
    pad.layers = ["top", "bottom"]
    delete pad.width
    delete pad.height
    delete pad.layer
  }
  for (const element of local) {
    if (element.type !== "pcb_smtpad") continue
    const pad = element as Record<string, unknown>
    pad.type = "pcb_plated_hole"
    pad.shape = "rotated_pill_hole_with_rect_pad"
    pad.hole_shape = "rotated_pill"
    pad.pad_shape = "rect"
    pad.hole_width = 0.5
    pad.hole_height = 1
    pad.hole_ccw_rotation = 90
    pad.rect_pad_width = 0.8
    pad.rect_pad_height = 1.3
    pad.rect_ccw_rotation = 90
    pad.hole_offset_x = 0
    pad.hole_offset_y = 0
    pad.layers = ["top", "bottom"]
    delete pad.width
    delete pad.height
    delete pad.layer
  }

  const result = compareSupplierFootprint({
    localCircuitJson: local,
    localPcbComponentId: "local_component",
    supplierCircuitJson: supplier,
  })

  expect(result.matches).toBeTrue()
})

test("supplier footprint check returns a non-passing result on fetch failure", async () => {
  const local = makeFootprint({
    componentId: "local_component",
    sourceComponentId: "local_source",
  }) as Array<AnyCircuitElement & Record<string, unknown>>
  const sourceComponent = local.find(
    (element) => element.type === "source_component",
  )!
  sourceComponent.supplier_part_numbers = { jlcpcb: ["C123"] }

  const result = await checkSupplierFootprintsInCircuitJson({
    circuitJson: local,
    fetchPartCircuitJson: async () => {
      throw new Error("offline")
    },
  })

  expect(result.hasErrors).toBeTrue()
  expect(result.output).toContain("failed to fetch supplier footprint: offline")
})

test("supplier footprint check caches duplicate supplier footprint requests", async () => {
  const first = makeFootprint({
    componentId: "local_component_1",
    sourceComponentId: "local_source_1",
  }) as Array<AnyCircuitElement & Record<string, unknown>>
  const second = makeFootprint({
    componentId: "local_component_2",
    sourceComponentId: "local_source_2",
    x: 5,
  }) as Array<AnyCircuitElement & Record<string, unknown>>
  first.find(
    (element) => element.type === "source_component",
  )!.supplier_part_numbers = { jlcpcb: ["C123"] }
  second.find(
    (element) => element.type === "source_component",
  )!.supplier_part_numbers = { jlcpcb: ["C123"] }
  const supplier = makeFootprint({
    componentId: "supplier_component",
    sourceComponentId: "supplier_source",
  })
  let fetchCount = 0

  const result = await checkSupplierFootprintsInCircuitJson({
    circuitJson: [...first, ...second],
    fetchPartCircuitJson: async () => {
      fetchCount++
      return supplier
    },
  })

  expect(result.hasErrors).toBeFalse()
  expect(result.checks).toHaveLength(2)
  expect(fetchCount).toBe(1)
})
