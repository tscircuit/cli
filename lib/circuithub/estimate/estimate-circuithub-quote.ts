import type {
  CircuithubEstimateInput,
  CircuithubEstimatePart,
} from "./circuithub-estimate-input"
import { CIRCUITHUB_ESTIMATE_CALIBRATION } from "./circuithub-estimate-calibration"
import { estimateCircuithubPartPrice } from "./circuithub-part-prices"

export { CIRCUITHUB_ESTIMATE_CALIBRATION }

type ByLayers = Readonly<Record<number, number>>

/** See circuithub-estimate-calibration.ts, which fit-circuithub-estimate.ts writes. */
export interface CircuithubEstimateCalibration {
  quotedOn: string
  calibratedLayers: readonly number[]
  boards: {
    us: {
      lotQuantity: number
      lot: {
        baseByLayers: Readonly<Record<CircuithubEstimateService, ByLayers>>
        perCm2ByLayers: ByLayers
      }
      volume: Readonly<
        Record<
          CircuithubEstimateService,
          { baseByLayers: ByLayers; perCm2: number }
        >
      >
    }
    overseas: Readonly<
      Record<"flexible" | "fast", { baseByLayers: ByLayers; perCm2: number }>
    >
  }
  assembly: Readonly<
    Record<
      CircuithubAssemblyTier,
      {
        setup: number
        perBomLine: number
        perThroughHoleLine: number
        secondSide: number
        perPlacement: number
        perThroughHolePlacement: number
      }
    >
  >
  parts: { priceFactor: number; perBomLine: number }
  leadTimeDays: {
    us: Readonly<Record<CircuithubEstimateService, readonly [number, number]>>
    overseas: Readonly<
      Record<"priority" | "standard" | "flexible", readonly [number, number]>
    >
  }
  gridProto: { maxQuantity: number; discount: number }
}

/** Where the bare boards are made; assembly is on CircuitHub's US Grid line either way. */
export type CircuithubEstimateFab = "us" | "overseas"

export type CircuithubEstimateService =
  | "priority_express"
  | "priority"
  | "standard"
  | "flexible"

/**
 * How fast the assembly line must work. Assembly costs the same at a tier
 * whichever fab makes the boards: overseas boards take longer to arrive, so
 * their Priority assembles at the fastest US tier and their Flexible at US
 * Priority's.
 */
export type CircuithubAssemblyTier =
  | "express"
  | "priority"
  | "standard"
  | "flexible"
  | "overseas_standard"

/** The offers CircuitHub's quotes list, fastest first within each fab. */
const OFFERS: {
  fab: CircuithubEstimateFab
  service: CircuithubEstimateService
  assemblyTier: CircuithubAssemblyTier
}[] = [
  { fab: "us", service: "priority_express", assemblyTier: "express" },
  { fab: "us", service: "priority", assemblyTier: "priority" },
  { fab: "us", service: "standard", assemblyTier: "standard" },
  { fab: "us", service: "flexible", assemblyTier: "flexible" },
  { fab: "overseas", service: "priority", assemblyTier: "express" },
  { fab: "overseas", service: "standard", assemblyTier: "overseas_standard" },
  { fab: "overseas", service: "flexible", assemblyTier: "priority" },
]

export const CIRCUITHUB_ESTIMATE_OFFERS = OFFERS

export interface CircuithubEstimateOffer {
  fab: CircuithubEstimateFab
  service: CircuithubEstimateService
  leadTimeDays: [number, number]
  boards: number
  parts: number
  assembly: number
  total: number
  perBoard: number
}

export interface CircuithubEstimate {
  quantity: number
  board: CircuithubEstimateInput["board"]
  placements: number
  bomLines: number
  sides: 1 | 2
  /** Parts priced from the reference table, and by type and package. */
  partsPriced: { reference: number; estimated: number }
  /** Where the estimate goes beyond the boards it was calibrated on. */
  notes: string[]
  offers: CircuithubEstimateOffer[]
  gridProto: {
    eligible: boolean
    /** Why it does not qualify. */
    reasons: string[]
    /** At US Priority (fastest): boards and assembly discounted, parts at full price. */
    boards?: number
    parts?: number
    assembly?: number
    total?: number
    perBoard?: number
  }
}

const round = (amount: number) => Math.round(amount * 100) / 100

/** Parts with the same part number on the same side make one BOM line. */
const groupBomLines = (parts: CircuithubEstimatePart[]) => {
  const lines = new Map<string, CircuithubEstimatePart[]>()
  for (const part of parts) {
    const key = `${part.manufacturerPartNumber ?? `${part.ftype}:${part.value ?? part.ref}`}|${part.side}`
    lines.set(key, [...(lines.get(key) ?? []), part])
  }
  return [...lines.values()]
}

/** How many BOM lines CircuitHub makes of these parts. */
export const countCircuithubBomLines = (parts: CircuithubEstimatePart[]) =>
  groupBomLines(parts).length

/**
 * 0201 and 01005 chips: two-pad parts under 0.8 mm long or with pads under
 * 0.25 mm. (Fine-pitch IC pads are narrower than that and are fine.)
 */
const isTinyPackage = (part: CircuithubEstimatePart) =>
  part.padCount === 2 &&
  (Math.max(part.widthMm, part.heightMm) < 0.8 ||
    (part.minPadMm !== undefined && part.minPadMm < 0.25))

/** A per-layer-count value, interpolated or extrapolated from the calibrated ones. */
const byLayers = (values: Record<number, number>, layers: number) => {
  if (values[layers] !== undefined) return values[layers]!
  const known = Object.keys(values)
    .map(Number)
    .sort((a, b) => a - b)
  const below = known.filter((count) => count < layers).at(-1)
  const above = known.find((count) => count > layers)
  if (below !== undefined && above !== undefined) {
    const t = (layers - below) / (above - below)
    return values[below]! + t * (values[above]! - values[below]!)
  }
  // Beyond the calibrated layer counts: grow from the nearest pair.
  const [a, b] =
    below === undefined
      ? [known[0]!, known[1]!]
      : [known.at(-2)!, known.at(-1)!]
  const slope = (values[b]! - values[a]!) / (b - a)
  return Math.max(0, values[b]! + slope * (layers - b))
}

/**
 * Estimate CircuitHub's assembled-board prices offline, without calling
 * CircuitHub: bare boards, parts and assembly for each offer a CircuitHub
 * quote lists (boards made in the US or overseas, at each service), and the
 * Grid Proto price when the build qualifies. Shipping and tax are excluded,
 * as in CircuitHub's quotes.
 */
export const estimateCircuithubQuote = (
  input: CircuithubEstimateInput,
  {
    quantity,
    calibration = CIRCUITHUB_ESTIMATE_CALIBRATION,
  }: {
    quantity: number
    /** Another calibration, e.g. one being fitted. */
    calibration?: CircuithubEstimateCalibration
  },
): CircuithubEstimate => {
  const lines = groupBomLines(input.parts)
  const placements = input.parts.length
  const throughHolePlacements = input.parts.filter(
    (part) => part.throughHole,
  ).length
  const sides = input.parts.some((part) => part.side === "bottom") ? 2 : 1
  const { layers } = input.board
  const areaCm2 = (input.board.widthMm * input.board.heightMm) / 100

  const partsPriced = { reference: 0, estimated: 0 }
  let partsPerBoard = 0
  for (const part of input.parts) {
    const { price, source } = estimateCircuithubPartPrice(part)
    partsPriced[source]++
    partsPerBoard += price
  }
  const parts =
    calibration.parts.priceFactor * partsPerBoard * quantity +
    calibration.parts.perBomLine * lines.length

  const boardsPrice = (
    fab: CircuithubEstimateFab,
    service: CircuithubEstimateService,
  ) => {
    if (fab === "us") {
      const us = calibration.boards.us
      // A small lot: a price per service and layer count, plus the board's area.
      if (quantity <= us.lotQuantity) {
        return (
          byLayers(us.lot.baseByLayers[service], layers) +
          byLayers(us.lot.perCm2ByLayers, layers) * areaCm2
        )
      }
      const volume = us.volume[service]
      return (
        byLayers(volume.baseByLayers, layers) +
        volume.perCm2 * quantity * areaCm2
      )
    }
    const overseas =
      calibration.boards.overseas[service === "flexible" ? "flexible" : "fast"]
    return (
      byLayers(overseas.baseByLayers, layers) +
      overseas.perCm2 * quantity * areaCm2
    )
  }

  const throughHoleLines = lines.filter((line) =>
    line.some((part) => part.throughHole),
  ).length
  const assemblyPrice = (tier: CircuithubAssemblyTier) => {
    const a = calibration.assembly[tier]
    return (
      a.setup +
      a.perBomLine * lines.length +
      a.perThroughHoleLine * throughHoleLines +
      (sides === 2 ? a.secondSide : 0) +
      quantity *
        (a.perPlacement * placements +
          a.perThroughHolePlacement * throughHolePlacements)
    )
  }

  const offers = OFFERS.map(({ fab, service, assemblyTier }) => {
    const boards = boardsPrice(fab, service)
    const assembly = assemblyPrice(assemblyTier)
    const total = boards + parts + assembly
    return {
      fab,
      service,
      leadTimeDays: [
        ...calibration.leadTimeDays[fab][service as "priority"],
      ] as [number, number],
      boards: round(boards),
      parts: round(parts),
      assembly: round(assembly),
      total: round(total),
      perBoard: round(total / quantity),
    }
  })

  const reasons: string[] = []
  if (quantity > calibration.gridProto.maxQuantity) {
    reasons.push(
      `more than ${calibration.gridProto.maxQuantity} boards (Grid Proto covers ${calibration.gridProto.maxQuantity} or fewer)`,
    )
  }
  const throughHole = input.parts.filter((part) => part.throughHole)
  if (throughHole.length > 0) {
    reasons.push(
      `through-hole or hybrid parts: ${throughHole.map((part) => part.ref).join(", ")}`,
    )
  }
  const tiny = input.parts.filter(isTinyPackage)
  if (tiny.length > 0) {
    reasons.push(
      `0201 or 01005 parts: ${tiny.map((part) => part.ref).join(", ")}`,
    )
  }
  if (layers > 4) reasons.push("more than 4 layers")
  const express = offers.find(
    (offer) => offer.fab === "us" && offer.service === "priority_express",
  )!
  const kept = 1 - calibration.gridProto.discount
  const gridProto = {
    boards: round(express.boards * kept),
    parts: round(parts),
    assembly: round(express.assembly * kept),
  }
  const gridProtoTotal = gridProto.boards + gridProto.parts + gridProto.assembly

  const notes: string[] = []
  if (!calibration.calibratedLayers.includes(layers)) {
    notes.push(
      `Calibrated on ${calibration.calibratedLayers.join(", ")}-layer boards; ${layers}-layer board prices are a rougher estimate`,
    )
  }

  return {
    quantity,
    board: input.board,
    placements,
    bomLines: lines.length,
    sides,
    partsPriced,
    notes,
    offers,
    gridProto:
      reasons.length > 0
        ? { eligible: false, reasons }
        : {
            eligible: true,
            reasons,
            ...gridProto,
            total: round(gridProtoTotal),
            perBoard: round(gridProtoTotal / quantity),
          },
  }
}
