import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
} from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import type { LoadedFootprint } from "./load-footprint-for-inspection"

export interface FootprintBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

export interface FootprintPadInspection {
  /** Pin number first, then any other names the pad answers to. */
  pin: string[]
  kind: "smtpad" | "plated_hole" | "hole"
  shape: string
  x: number
  y: number
  /** Copper extent (drill extent for an unplated hole), axis aligned. */
  width: number
  height: number
  /** Drill size; two numbers for a slot. */
  hole?: { width: number; height: number }
  layers: string[]
}

export interface FootprintInspection {
  input: string
  source: LoadedFootprint["kind"]
  sourceDescription: string
  parameters?: Record<string, unknown>
  padCounts: { smtpad: number; plated_hole: number; hole: number }
  copperBounds: FootprintBounds | null
  courtyardBounds: FootprintBounds | null
  pads: FootprintPadInspection[]
}

const round = (value: number) => {
  const rounded = Number(value.toFixed(4))
  return Object.is(rounded, -0) ? 0 : rounded
}

const toFootprintBounds = (bounds: {
  minX: number
  maxX: number
  minY: number
  maxY: number
}): FootprintBounds | null => {
  if (!Object.values(bounds).every(Number.isFinite)) return null
  return {
    minX: round(bounds.minX),
    maxX: round(bounds.maxX),
    minY: round(bounds.minY),
    maxY: round(bounds.maxY),
    width: round(bounds.maxX - bounds.minX),
    height: round(bounds.maxY - bounds.minY),
  }
}

const getHoleSize = (element: Record<string, any>) => {
  if (typeof element.hole_diameter === "number") {
    return {
      width: round(element.hole_diameter),
      height: round(element.hole_diameter),
    }
  }
  if (
    typeof element.hole_width === "number" &&
    typeof element.hole_height === "number"
  ) {
    return {
      width: round(element.hole_width),
      height: round(element.hole_height),
    }
  }
  return undefined
}

/** "3" and "pin3" are both pin 3; names such as "A1" or "GND" have no number. */
const getPinNumber = (pad: FootprintPadInspection) => {
  for (const name of pad.pin) {
    const match = name.match(/^(?:pin)?(\d+)$/i)
    if (match) return Number.parseInt(match[1]!, 10)
  }
  return Number.NaN
}

const comparePins = (a: FootprintPadInspection, b: FootprintPadInspection) => {
  const aNumber = getPinNumber(a)
  const bNumber = getPinNumber(b)
  const aIsNumbered = Number.isFinite(aNumber)
  const bIsNumbered = Number.isFinite(bNumber)
  if (aIsNumbered && bIsNumbered) return aNumber - bNumber
  if (aIsNumbered) return -1
  if (bIsNumbered) return 1
  return (a.pin[0] ?? "").localeCompare(b.pin[0] ?? "", undefined, {
    numeric: true,
  })
}

/**
 * Pads rendered from a component file carry a port id instead of hints, so
 * look the pin names up through the port.
 */
const getPinNamesByPcbPortId = (circuitJson: AnyCircuitElement[]) => {
  const sourcePortById = new Map<string, Record<string, any>>()
  for (const element of circuitJson as Record<string, any>[]) {
    if (element.type === "source_port") {
      sourcePortById.set(element.source_port_id, element)
    }
  }
  const pinNamesByPcbPortId = new Map<string, string[]>()
  for (const element of circuitJson as Record<string, any>[]) {
    if (element.type !== "pcb_port") continue
    const sourcePort = sourcePortById.get(element.source_port_id)
    if (!sourcePort) continue
    const names = [
      sourcePort.pin_number !== undefined ? String(sourcePort.pin_number) : "",
      ...(Array.isArray(sourcePort.port_hints) ? sourcePort.port_hints : []),
      sourcePort.name,
    ].filter((name): name is string => typeof name === "string" && name !== "")
    pinNamesByPcbPortId.set(element.pcb_port_id, [...new Set(names)])
  }
  return pinNamesByPcbPortId
}

const PAD_KIND_BY_TYPE: Record<string, FootprintPadInspection["kind"]> = {
  pcb_smtpad: "smtpad",
  pcb_plated_hole: "plated_hole",
  pcb_hole: "hole",
}

export const getFootprintInspection = (
  footprint: LoadedFootprint,
): FootprintInspection => {
  const { circuitJson } = footprint
  const pcbComponentCount = circuitJson.filter(
    (element) => element.type === "pcb_component",
  ).length
  if (pcbComponentCount > 1) {
    throw new Error(
      `Expected one footprint but found ${pcbComponentCount} components. Pass a file that renders a single component or footprint.`,
    )
  }

  const pinNamesByPcbPortId = getPinNamesByPcbPortId(circuitJson)
  const pads: FootprintPadInspection[] = []
  const copperElements: AnyCircuitElement[] = []

  for (const element of circuitJson as Record<string, any>[]) {
    const kind = PAD_KIND_BY_TYPE[element.type]
    if (!kind) continue
    const bounds = getPcbElementBounds(element as AnyCircuitElement)
    if (!bounds) continue
    if (kind !== "hole") copperElements.push(element as AnyCircuitElement)

    const hints: string[] = Array.isArray(element.port_hints)
      ? element.port_hints.map(String)
      : []
    const names = [
      ...new Set([
        ...hints,
        ...(pinNamesByPcbPortId.get(element.pcb_port_id) ?? []),
      ]),
    ]
    // "pin3" adds nothing next to "3".
    const pin = names.filter(
      (name) => !(/^pin\d+$/i.test(name) && names.includes(name.slice(3))),
    )

    pads.push({
      pin,
      kind,
      shape: String(element.shape ?? element.hole_shape ?? "unknown"),
      x: round(
        typeof element.x === "number"
          ? element.x
          : (bounds.minX + bounds.maxX) / 2,
      ),
      y: round(
        typeof element.y === "number"
          ? element.y
          : (bounds.minY + bounds.maxY) / 2,
      ),
      width: round(bounds.maxX - bounds.minX),
      height: round(bounds.maxY - bounds.minY),
      hole: getHoleSize(element),
      layers:
        kind === "smtpad"
          ? [String(element.layer ?? "top")]
          : Array.isArray(element.layers)
            ? element.layers.map(String)
            : ["top", "bottom"],
    })
  }

  if (pads.length === 0) {
    throw new Error("The footprint has no pads or holes to inspect")
  }

  pads.sort(comparePins)

  const courtyardElements = circuitJson.filter((element) =>
    element.type.startsWith("pcb_courtyard"),
  )

  return {
    input: footprint.input,
    source: footprint.kind,
    sourceDescription: footprint.sourceDescription,
    parameters: footprint.parameters,
    padCounts: {
      smtpad: pads.filter((pad) => pad.kind === "smtpad").length,
      plated_hole: pads.filter((pad) => pad.kind === "plated_hole").length,
      hole: pads.filter((pad) => pad.kind === "hole").length,
    },
    copperBounds:
      copperElements.length > 0
        ? toFootprintBounds(getBoundsOfPcbElements(copperElements))
        : null,
    courtyardBounds:
      courtyardElements.length > 0
        ? toFootprintBounds(getBoundsOfPcbElements(courtyardElements))
        : null,
    pads,
  }
}
