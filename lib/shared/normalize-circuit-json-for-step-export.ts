import type { AnyCircuitElement } from "circuit-json"

export function normalizeCircuitJsonForStepExport(
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  return circuitJson.map((element) => {
    if (
      !element ||
      (element.type !== "pcb_hole" && element.type !== "pcb_plated_hole")
    ) {
      return element
    }

    const hole = element as Record<string, unknown>
    const holeShape = hole.hole_shape ?? hole.shape
    const isRoundPillDrill =
      (holeShape === "pill" ||
        holeShape === "rotated_pill" ||
        (holeShape === "oval" && element.type === "pcb_plated_hole")) &&
      typeof hole.hole_width === "number" &&
      typeof hole.hole_height === "number" &&
      hole.hole_width === hole.hole_height

    if (!isRoundPillDrill) {
      return element
    }

    return {
      ...element,
      hole_shape: "circle",
      hole_diameter: hole.hole_width as number,
    } as AnyCircuitElement
  })
}
