import { expect, test, describe } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { calculateCameraPosition } from "lib/shared/calculate-camera-position"

describe("calculateCameraPosition", () => {
  test("should return default position for empty circuit", () => {
    const result = calculateCameraPosition([])
    expect(result).toEqual({
      camPos: [10, 10, 10],
      lookAt: [0, 0, 0],
    })
  })

  test("should calculate position based on pcb_board", () => {
    const circuitJson: AnyCircuitElement[] = [
      {
        type: "pcb_board",
        width: 10,
        height: 10,
        center: { x: 0, y: 0 },
        pcb_board_id: "board1",
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      },
    ]
    const result = calculateCameraPosition(circuitJson as AnyCircuitElement[])

    // Board is 10x10 centered at 0,0.
    // effectiveMinX = -5, effectiveMaxX = 5
    // effectiveMinY = -5, effectiveMaxY = 5
    // width = 10, height = 10
    // maxDimension = 10
    // cameraDistance = 10 * 1.2 = 12
    // centerX = 0, centerY = 0
    // camPos = [0 + 12*0.7, 0 + 12*0.7, 12*0.7] = [8.4, 8.4, 8.4]

    expect(result.lookAt).toEqual([0, 0, 0])
    expect(result.camPos[0]).toBeCloseTo(8.4)
    expect(result.camPos[1]).toBeCloseTo(8.4)
    expect(result.camPos[2]).toBeCloseTo(8.4)
  })

  test("should calculate position based on components without board", () => {
    const circuitJson: AnyCircuitElement[] = [
      {
        type: "pcb_component",
        center: { x: 10, y: 10 },
        width: 2,
        height: 2,
        pcb_component_id: "comp1",
        source_component_id: "source1",
        layer: "top",
        rotation: 0,
        obstructs_within_bounds: true,
      },
      {
        type: "pcb_component",
        center: { x: -10, y: -10 },
        width: 2,
        height: 2,
        pcb_component_id: "comp2",
        source_component_id: "source2",
        layer: "top",
        rotation: 0,
        obstructs_within_bounds: true,
      },
    ]
    const result = calculateCameraPosition(circuitJson)

    // minX = -11, maxX = 11 (center +/- width/2)
    // minY = -11, maxY = 11
    // centerX = 0, centerY = 0
    // width = 22, height = 22
    // maxDimension = 22
    // cameraDistance = 22 * 1.2 = 26.4
    // camPos = [0 + 26.4*0.7, 0 + 26.4*0.7, 26.4*0.7] = [18.48, 18.48, 18.48]

    expect(result.lookAt).toEqual([0, 0, 0])
    expect(result.camPos[0]).toBeCloseTo(18.48)
    expect(result.camPos[1]).toBeCloseTo(18.48)
    expect(result.camPos[2]).toBeCloseTo(18.48)
  })
})
