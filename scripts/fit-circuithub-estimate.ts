/**
 * Refit the `tsci quote estimate --circuithub` calibration from real
 * CircuitHub quotes, write it to circuithub-estimate-calibration.ts, and show
 * how close the estimate is to each quote.
 *
 *   bun scripts/fit-circuithub-estimate.ts
 *
 * Add quotes to tests/fixtures/circuithub-reference-quotes.json (input from
 * getCircuithubEstimateInput, offers from CircuitHub's quote API) and run
 * this. CircuitHub's prices change, so replace old quotes rather than mixing
 * them with new ones.
 */
import fs from "node:fs"
import path from "node:path"
import { estimateCircuithubPartPrice } from "lib/circuithub/estimate/circuithub-part-prices"
import {
  CIRCUITHUB_ESTIMATE_OFFERS,
  type CircuithubAssemblyTier,
  type CircuithubEstimateFab,
  type CircuithubEstimateService,
  countCircuithubBomLines,
  type CircuithubEstimateCalibration,
  estimateCircuithubQuote,
} from "lib/circuithub/estimate/estimate-circuithub-quote"
import {
  type CircuithubReferenceQuote,
  loadCircuithubReferenceQuotes,
  offersByFabAndService,
} from "tests/fixtures/circuithub-reference-quotes"

const allQuotes = loadCircuithubReferenceQuotes()

/**
 * Least squares with non-negative coefficients (drops negative terms), on
 * relative errors, so small boards count as much as big ones.
 */
const fitNonNegative = (
  unscaledRows: number[][],
  unscaledTargets: number[],
) => {
  const rows = unscaledRows.map((row, k) =>
    row.map((value) => value / unscaledTargets[k]!),
  )
  const targets = unscaledTargets.map(() => 1)
  let active = rows[0]!.map((_, index) => index)
  for (;;) {
    const n = active.length
    const ata = active.map((i) =>
      active.map((j) => rows.reduce((s, r) => s + r[i]! * r[j]!, 0)),
    )
    const atb = active.map((i) =>
      rows.reduce((s, r, k) => s + r[i]! * targets[k]!, 0),
    )
    for (let c = 0; c < n; c++) {
      let p = c
      for (let r = c + 1; r < n; r++)
        if (Math.abs(ata[r]![c]!) > Math.abs(ata[p]![c]!)) p = r
      ;[ata[c], ata[p]] = [ata[p]!, ata[c]!]
      ;[atb[c], atb[p]] = [atb[p]!, atb[c]!]
      for (let r = 0; r < n; r++) {
        if (r === c || ata[c]![c] === 0) continue
        const f = ata[r]![c]! / ata[c]![c]!
        for (let k = c; k < n; k++) ata[r]![k]! -= f * ata[c]![k]!
        atb[r]! -= f * atb[c]!
      }
    }
    const solution = active.map((_, i) =>
      ata[i]![i] === 0 ? 0 : atb[i]! / ata[i]![i]!,
    )
    const negative = solution.findIndex((value) => value < 0)
    if (negative === -1) {
      const coefficients = rows[0]!.map(() => 0)
      active.forEach((index, i) => (coefficients[index] = solution[i]!))
      return coefficients
    }
    active = active.filter((_, i) => i !== negative)
  }
}

const round = (value: number, digits = 3) => Number(value.toFixed(digits))

/** Fit every part of the calibration to these quotes. */
const fitCalibration = (
  quotes: CircuithubReferenceQuote[],
): CircuithubEstimateCalibration => {
  const areaCm2 = (q: CircuithubReferenceQuote) =>
    (q.input.board.widthMm * q.input.board.heightMm) / 100
  const layersOf = (rows: { quote: CircuithubReferenceQuote }[]) =>
    [...new Set(rows.map(({ quote }) => quote.input.board.layers))].sort(
      (a, b) => a - b,
    )
  const byLayers = (layers: number[], values: number[]) =>
    Object.fromEntries(layers.map((count, i) => [count, round(values[i]!, 2)]))

  const US_LOT_QUANTITY = 10
  const SERVICES: CircuithubEstimateService[] = [
    "priority_express",
    "priority",
    "standard",
    "flexible",
  ]
  const offersOf = (
    fab: CircuithubEstimateFab,
    service: CircuithubEstimateService,
  ) =>
    quotes.flatMap((quote) => {
      const offer = offersByFabAndService(quote)[fab][service]
      return offer ? [{ quote, offer }] : []
    })
  type Rows = ReturnType<typeof offersOf>

  // Bare boards made in the US, up to the lot: a base per service and layer
  // count, plus a price per cm² of the board per layer count.
  const lotRows = SERVICES.flatMap((service) =>
    offersOf("us", service)
      .filter(({ quote }) => quote.quantity <= US_LOT_QUANTITY)
      .map((row) => ({ ...row, service })),
  )
  const lotLayers = layersOf(lotRows)
  const lotFit = fitNonNegative(
    lotRows.map(({ quote, service }) => [
      ...SERVICES.flatMap((s) =>
        lotLayers.map((l) =>
          s === service && quote.input.board.layers === l ? 1 : 0,
        ),
      ),
      ...lotLayers.map((l) =>
        quote.input.board.layers === l ? areaCm2(quote) : 0,
      ),
    ]),
    lotRows.map(({ offer }) => offer.boards),
  )
  const lot = {
    baseByLayers: Object.fromEntries(
      SERVICES.map((s, i) => [
        s,
        byLayers(
          lotLayers,
          lotFit.slice(i * lotLayers.length, (i + 1) * lotLayers.length),
        ),
      ]),
    ),
    perCm2ByLayers: byLayers(
      lotLayers,
      lotFit.slice(SERVICES.length * lotLayers.length),
    ),
  }

  // More boards, per service: a base per layer count plus a price per cm² ordered.
  const volumeFit = (rows: Rows) => {
    const layers = layersOf(rows)
    const fit = fitNonNegative(
      rows.map(({ quote }) => [
        ...layers.map((l) => (quote.input.board.layers === l ? 1 : 0)),
        quote.quantity * areaCm2(quote),
      ]),
      rows.map(({ offer }) => offer.boards),
    )
    return {
      baseByLayers: byLayers(layers, fit),
      perCm2: round(fit[layers.length]!, 4),
    }
  }
  const usVolume = Object.fromEntries(
    SERVICES.map((service) => [
      service,
      volumeFit(
        offersOf("us", service).filter(
          ({ quote }) => quote.quantity > US_LOT_QUANTITY,
        ),
      ),
    ]),
  )
  // Overseas: Flexible, and Priority and Standard, which cost about the same.
  const overseas = {
    flexible: volumeFit(offersOf("overseas", "flexible")),
    fast: volumeFit([
      ...offersOf("overseas", "priority"),
      ...offersOf("overseas", "standard"),
    ]),
  }

  // Assembly per tier: setup, per BOM line, per through-hole line, second
  // side, and per placement (and through-hole placement) per board.
  const assemblyFit = (rows: Rows) => {
    const fit = fitNonNegative(
      rows.map(({ quote }) => {
        const { parts } = quote.input
        const throughHole = parts.filter((p) => p.throughHole)
        return [
          1,
          countCircuithubBomLines(parts),
          countCircuithubBomLines(throughHole),
          parts.some((p) => p.side === "bottom") ? 1 : 0,
          parts.length * quote.quantity,
          throughHole.length * quote.quantity,
        ]
      }),
      rows.map(({ offer }) => offer.assembly),
    )
    return {
      setup: round(fit[0]!, 1),
      perBomLine: round(fit[1]!, 2),
      perThroughHoleLine: round(fit[2]!, 2),
      secondSide: round(fit[3]!, 1),
      perPlacement: round(fit[4]!, 3),
      perThroughHolePlacement: round(fit[5]!, 3),
    }
  }
  const tierRows = (tier: CircuithubAssemblyTier) =>
    CIRCUITHUB_ESTIMATE_OFFERS.filter(
      (offer) => offer.assemblyTier === tier,
    ).flatMap(({ fab, service }) => offersOf(fab, service))
  const assembly = Object.fromEntries(
    (
      [
        "express",
        "priority",
        "standard",
        "flexible",
        "overseas_standard",
      ] as const
    ).map((tier) => [tier, assemblyFit(tierRows(tier))]),
  )

  // Parts: price factor x listed prices x quantity + per BOM line. Only boards
  // whose input comes from circuit JSON: CircuitHub's BOM lacks part details.
  const partsQuotes = quotes.filter(
    (q) => q.inputSource !== "circuithub-bom" && q.offers[0],
  )
  const partsFit = fitNonNegative(
    partsQuotes.map((quote) => {
      const listed = quote.input.parts.reduce(
        (sum, part) => sum + estimateCircuithubPartPrice(part).price,
        0,
      )
      return [
        listed * quote.quantity,
        countCircuithubBomLines(quote.input.parts),
      ]
    }),
    partsQuotes.map((quote) => quote.offers[0]!.parts),
  )

  // Ship dates, in calendar days from the quote.
  const days = (from: string, to: string) =>
    Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
  const leadTime = (
    fab: CircuithubEstimateFab,
    service: CircuithubEstimateService,
  ) => {
    const rows = offersOf(fab, service)
    return [
      Math.min(
        ...rows.map(({ quote, offer }) =>
          days(quote.quotedOn, offer.shipDate.earliest),
        ),
      ),
      Math.max(
        ...rows.map(({ quote, offer }) =>
          days(quote.quotedOn, offer.shipDate.latest),
        ),
      ),
    ]
  }

  const calibration = {
    quotedOn: [...new Set(quotes.map((q) => q.quotedOn))].sort().join(", "),
    calibratedLayers: layersOf(quotes.map((quote) => ({ quote }))),
    boards: {
      us: {
        lotQuantity: US_LOT_QUANTITY,
        lot,
        volume: usVolume,
      },
      overseas,
    },
    assembly,
    parts: {
      priceFactor: round(partsFit[0]!, 3),
      perBomLine: round(partsFit[1]!, 2),
    },
    leadTimeDays: {
      us: Object.fromEntries(SERVICES.map((s) => [s, leadTime("us", s)])),
      overseas: Object.fromEntries(
        (["priority", "standard", "flexible"] as const).map((s) => [
          s,
          leadTime("overseas", s),
        ]),
      ),
    },
    gridProto: { maxQuantity: 10, discount: 0.75 },
  }
  // Object.fromEntries loses the keys' types; the fits above fill every one.
  return calibration as unknown as CircuithubEstimateCalibration
}

const calibration = fitCalibration(allQuotes)

const target = path.join(
  import.meta.dir,
  "../lib/circuithub/estimate/circuithub-estimate-calibration.ts",
)
fs.writeFileSync(
  target,
  `/**
 * Calibration of \`tsci quote estimate --circuithub\`, fitted to real
 * CircuitHub quotes (tests/fixtures/circuithub-reference-quotes.json) by
 * \`bun scripts/fit-circuithub-estimate.ts\`, which writes this file.
 *
 * - boards.us: boards made in the US. Up to lotQuantity boards: a base per
 *   service and layer count + perCm2 of one board. More boards: a base +
 *   perCm2 of all the boards ordered, per service.
 * - boards.overseas: boards made overseas (Flexible, and Priority and
 *   Standard, which cost the same): base + perCm2 of all the boards ordered.
 * - assembly: on CircuitHub's US Grid line, per order and per placement per
 *   board, for each speed tier (see CIRCUITHUB_ESTIMATE_OFFERS for which
 *   offer assembles at which tier).
 * - parts: reference or estimated unit prices x priceFactor, plus a little
 *   per BOM line for spares and handling.
 * - gridProto: 75% off boards and assembly at US Priority (fastest), parts at
 *   full price, for 10 boards or fewer.
 */
import type { CircuithubEstimateCalibration } from "./estimate-circuithub-quote"

export const CIRCUITHUB_ESTIMATE_CALIBRATION: CircuithubEstimateCalibration = ${JSON.stringify(calibration, null, 2)}
`,
)
console.log(
  `Wrote ${path.relative(process.cwd(), target)}; run \`bun run format\`.`,
)

const pct = (estimate: number, actual: number) =>
  `${(((estimate - actual) / actual) * 100).toFixed(0).padStart(4)}%`

/** Each offer's estimate against CircuitHub's price; prints them with `log`. */
const compare = (
  quotes: CircuithubReferenceQuote[],
  fitted: CircuithubEstimateCalibration,
  log: (line: string) => void = () => {},
) => {
  const errors: number[] = []
  for (const quote of quotes) {
    const e = estimateCircuithubQuote(quote.input, {
      quantity: quote.quantity,
      calibration: fitted,
    })
    const actual = offersByFabAndService(quote)
    for (const offer of e.offers) {
      const real = actual[offer.fab][offer.service]
      if (!real) continue
      // Boards whose input came from CircuitHub's BOM: their part prices are
      // rough, so compare with CircuitHub's parts price in.
      const total =
        quote.inputSource === "circuithub-bom"
          ? offer.total - offer.parts + real.parts
          : offer.total
      errors.push(Math.abs(total - real.total) / real.total)
      log(
        `${quote.board.padEnd(24)} x${String(quote.quantity).padEnd(3)} ${offer.fab.padEnd(8)} ${offer.service.padEnd(16)} total ${total.toFixed(0).padStart(6)} vs ${real.total.toFixed(0).padStart(6)} ${pct(total, real.total)}  boards ${pct(offer.boards, real.boards)}  parts ${pct(offer.parts, real.parts)}  assembly ${pct(offer.assembly, real.assembly)}`,
      )
    }
    if (quote.gridProto && e.gridProto.total !== undefined) {
      log(
        `${"".padEnd(29)} grid proto               total ${e.gridProto.total.toFixed(0).padStart(6)} vs ${quote.gridProto.total.toFixed(0).padStart(6)} ${pct(e.gridProto.total, quote.gridProto.total)}`,
      )
    }
  }
  return errors
}
const summarize = (errors: number[]) => {
  const sorted = [...errors].sort((a, b) => a - b)
  const rms = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length)
  return `${errors.length} offers, RMS ${(rms * 100).toFixed(1)}%, median ${(sorted[Math.floor(sorted.length / 2)]! * 100).toFixed(1)}%, worst ${(sorted.at(-1)! * 100).toFixed(1)}%`
}

console.log("\nThe new calibration vs real quotes:")
const inSample = compare(allQuotes, calibration, console.log)
console.log(`\nFitted on all boards: ${summarize(inSample)}`)

// Leave one board out: fit without it and estimate it, as for a new board.
const boards = [...new Set(allQuotes.map((quote) => quote.board))]
const heldOut = boards.flatMap((board) => {
  const errors = compare(
    allQuotes.filter((quote) => quote.board === board),
    fitCalibration(allQuotes.filter((quote) => quote.board !== board)),
  )
  console.log(`Fitted without ${board}, estimating it: ${summarize(errors)}`)
  return errors
})
console.log(`Each board fitted without itself: ${summarize(heldOut)}`)
