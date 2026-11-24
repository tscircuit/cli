import type {
  CircuithubEstimateInput,
  CircuithubEstimatePart,
} from "./circuithub-estimate-input"
import { estimateCircuithubPartPrice } from "./circuithub-part-prices"

/**
 * Calibration fitted to real CircuitHub quotes for boards built on the US
 * Grid line (tests/fixtures/circuithub-reference-quotes.json). Refit with
 * `bun scripts/fit-circuithub-estimate.ts` after adding quotes there.
 */
export const CIRCUITHUB_ESTIMATE_CALIBRATION = {
  assembly: {
    /** Flexible service, per order. */
    setup: 119.4,
    perBomLine: 4.39,
    secondSide: 176.5,
    /** Per placement per board. */
    perPlacement: 0.275,
  },
  /** Assembly price of each service relative to Flexible. */
  assemblyServiceFactor: {
    priority_express: 1.55,
    priority: 1.31,
    standard: 1.13,
    flexible: 1,
  },
  boards: {
    /** A lot of up to `lotSize` 4-layer boards, standard service. */
    lotPrice: 580,
    lotSize: 10,
    /** Each board beyond the lot, per cm² of board. */
    perCm2: 2.44,
    /** Price relative to 4 layers; 2 and 6 layers are not calibrated yet. */
    layerFactor: { 1: 0.7, 2: 0.7, 4: 1, 6: 1.4, 8: 1.9 } as Record<
      number,
      number
    >,
  },
  /** Bare-board price of each service relative to Standard. */
  boardServiceFactor: {
    priority_express: 1.08,
    priority: 1.1,
    standard: 1,
    flexible: 1,
  },
  parts: {
    /** Scales reference and estimated unit prices to CircuitHub's. */
    priceFactor: 0.976,
    /** Per BOM line per order: spares and handling. */
    perBomLine: 0.37,
  },
  /** Grid Proto: 75% off boards and assembly at Priority, parts at full price. */
  gridProto: { maxQuantity: 10, discount: 0.75 },
} as const

export type CircuithubEstimateService =
  keyof typeof CIRCUITHUB_ESTIMATE_CALIBRATION.assemblyServiceFactor

/** Typical ship dates on the Grid, in calendar days from ordering. */
const LEAD_TIME_DAYS: Record<CircuithubEstimateService, [number, number]> = {
  priority_express: [6, 6],
  priority: [12, 12],
  standard: [13, 20],
  flexible: [14, 28],
}

export interface CircuithubEstimateOffer {
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
    /** At Priority: boards and assembly discounted, parts at full price. */
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

/**
 * 0201 and 01005 chips: two-pad parts under 0.8 mm long or with pads under
 * 0.25 mm. (Fine-pitch IC pads are narrower than that and are fine.)
 */
const isTinyPackage = (part: CircuithubEstimatePart) =>
  part.padCount === 2 &&
  (Math.max(part.widthMm, part.heightMm) < 0.8 ||
    (part.minPadMm !== undefined && part.minPadMm < 0.25))

/**
 * Estimate CircuitHub's assembled-board prices offline, without calling
 * CircuitHub: bare boards, parts and assembly for each service, and the Grid
 * Proto price when the build qualifies. Shipping and tax are excluded, as in
 * CircuitHub's quotes.
 */
export const estimateCircuithubQuote = (
  input: CircuithubEstimateInput,
  { quantity }: { quantity: number },
): CircuithubEstimate => {
  const calibration = CIRCUITHUB_ESTIMATE_CALIBRATION
  const lines = groupBomLines(input.parts)
  const placements = input.parts.length
  const sides = input.parts.some((part) => part.side === "bottom") ? 2 : 1

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

  const areaCm2 = (input.board.widthMm * input.board.heightMm) / 100
  const layerFactor =
    calibration.boards.layerFactor[input.board.layers] ??
    1 + 0.25 * (input.board.layers - 4)
  const boardsStandard =
    layerFactor *
    (calibration.boards.lotPrice +
      Math.max(0, quantity - calibration.boards.lotSize) *
        calibration.boards.perCm2 *
        areaCm2)

  const assemblyFlexible =
    calibration.assembly.setup +
    calibration.assembly.perBomLine * lines.length +
    (sides === 2 ? calibration.assembly.secondSide : 0) +
    calibration.assembly.perPlacement * placements * quantity

  const offers = (
    Object.keys(
      calibration.assemblyServiceFactor,
    ) as CircuithubEstimateService[]
  ).map((service) => {
    const boards = boardsStandard * calibration.boardServiceFactor[service]
    const assembly =
      assemblyFlexible * calibration.assemblyServiceFactor[service]
    const total = boards + parts + assembly
    return {
      service,
      leadTimeDays: LEAD_TIME_DAYS[service],
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
  if (input.board.layers > 4) reasons.push("more than 4 layers")
  const express = offers.find((offer) => offer.service === "priority_express")!
  const kept = 1 - calibration.gridProto.discount
  const gridProto = {
    boards: round(express.boards * kept),
    parts: round(parts),
    assembly: round(express.assembly * kept),
  }
  const gridProtoTotal = gridProto.boards + gridProto.parts + gridProto.assembly

  const notes: string[] = []
  if (input.board.layers !== 4) {
    notes.push(
      `Calibrated on 4-layer boards; ${input.board.layers}-layer board prices are a rougher estimate`,
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
