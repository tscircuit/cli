import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbComponentViewport } from "lib/shared/get-pcb-component-viewport"

const circuitJson = [
  {
    type: "source_component",
    source_component_id: "source_component_0",
    name: "U1",
    ftype: "simple_chip",
  },
  {
    type: "source_component",
    source_component_id: "source_component_1",
    name: "U2",
    ftype: "simple_chip",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    center: { x: 10, y: 20 },
    width: 4,
    height: 2,
    layer: "top",
    rotation: 90,
    obstructs_within_bounds: true,
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    center: { x: -10, y: -20 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
    obstructs_within_bounds: true,
  },
] as AnyCircuitElement[]

test("gets a padded viewport for a rotated PCB component", () => {
  expect(getPcbComponentViewport(circuitJson, "U1", 2)).toEqual({
    minX: 7,
    minY: 16,
    maxX: 13,
    maxY: 24,
  })
})

test("lists available components when the requested component is missing", () => {
  expect(() => getPcbComponentViewport(circuitJson, "U3")).toThrow(
    'PCB component "U3" was not found. Available PCB components: U1, U2.',
  )
})
