import type { AnyCircuitElement } from "circuit-json"

/** One part CircuitHub would buy and place. */
export interface CircuithubEstimatePart {
  /** Reference designator, e.g. "R1". */
  ref: string
  /** tscircuit component type, e.g. "simple_resistor" or "simple_chip". */
  ftype: string
  manufacturerPartNumber?: string
  /** Ohms for resistors, farads for capacitors. */
  value?: number
  side: "top" | "bottom"
  /** Surface-mount pads plus plated holes. */
  padCount: number
  /** The footprint's bounding box, mm. */
  widthMm: number
  heightMm: number
  /** Has plated holes (through-hole or hybrid part). */
  throughHole: boolean
  /** Shortest side of its smallest surface-mount pad, mm. */
  minPadMm?: number
}

export interface CircuithubEstimateInput {
  board: { widthMm: number; heightMm: number; layers: number }
  parts: CircuithubEstimatePart[]
}

/** Test points and bare pads are not bought or placed. */
const NOT_ASSEMBLED_FTYPES = new Set(["simple_test_point"])

/**
 * Reduce circuit JSON to what the estimate needs: the board and the parts
 * CircuitHub would assemble. Do-not-place parts, test points and footprints
 * without a part number that are only holes (mounting holes) are left out.
 */
export const getCircuithubEstimateInput = (
  circuitJson: AnyCircuitElement[],
): CircuithubEstimateInput => {
  const elements = circuitJson as any[]
  const board = elements.find((element) => element.type === "pcb_board")
  if (!board) throw new Error("The circuit has no PCB board to estimate.")

  const sourceById = new Map(
    elements
      .filter((element) => element.type === "source_component")
      .map((element) => [element.source_component_id, element]),
  )
  const padsByComponent = new Map<string, any[]>()
  const holesByComponent = new Map<string, any[]>()
  for (const element of elements) {
    if (!element.pcb_component_id) continue
    const target =
      element.type === "pcb_smtpad"
        ? padsByComponent
        : element.type === "pcb_plated_hole"
          ? holesByComponent
          : null
    if (!target) continue
    const list = target.get(element.pcb_component_id) ?? []
    list.push(element)
    target.set(element.pcb_component_id, list)
  }

  const parts: CircuithubEstimatePart[] = []
  for (const component of elements) {
    if (component.type !== "pcb_component" || component.do_not_place) continue
    const source = sourceById.get(component.source_component_id)
    if (!source || NOT_ASSEMBLED_FTYPES.has(source.ftype)) continue
    const pads = padsByComponent.get(component.pcb_component_id) ?? []
    const holes = holesByComponent.get(component.pcb_component_id) ?? []
    const mpn: string | undefined = source.manufacturer_part_number || undefined
    if (!mpn && pads.length === 0) continue // mounting hole or fiducial
    const padSizes = pads
      .map((pad) =>
        pad.shape === "circle"
          ? (pad.radius ?? 0) * 2
          : Math.min(pad.width ?? Infinity, pad.height ?? Infinity),
      )
      .filter((size) => Number.isFinite(size) && size > 0)
    parts.push({
      ref: source.name,
      ftype: source.ftype ?? "simple_chip",
      manufacturerPartNumber: mpn,
      value:
        typeof source.resistance === "number"
          ? source.resistance
          : typeof source.capacitance === "number"
            ? source.capacitance
            : undefined,
      side: component.layer === "bottom" ? "bottom" : "top",
      padCount: pads.length + holes.length,
      widthMm: component.width ?? 0,
      heightMm: component.height ?? 0,
      throughHole: holes.length > 0,
      minPadMm: padSizes.length > 0 ? Math.min(...padSizes) : undefined,
    })
  }

  return {
    board: {
      widthMm: board.width ?? 0,
      heightMm: board.height ?? 0,
      layers: board.num_layers ?? 2,
    },
    parts,
  }
}
