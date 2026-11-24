/**
 * Refit the `tsci quote estimate --circuithub` calibration from real
 * CircuitHub quotes, and show how close the current calibration is.
 *
 *   bun scripts/fit-circuithub-estimate.ts
 *
 * Add quotes to tests/fixtures/circuithub-reference-quotes.json (input from
 * getCircuithubEstimateInput, offers from CircuitHub's quote API), run this,
 * and copy the printed values into CIRCUITHUB_ESTIMATE_CALIBRATION.
 */
import { estimateCircuithubPartPrice } from "lib/circuithub/estimate/circuithub-part-prices"
import {
  type CircuithubReferenceQuote,
  estimateReferenceQuote,
  loadCircuithubReferenceQuotes,
  usOffersByService,
} from "tests/fixtures/circuithub-reference-quotes"

const quotes = loadCircuithubReferenceQuotes()

/** Least squares with non-negative coefficients (drops negative terms). */
const fitNonNegative = (rows: number[][], targets: number[]) => {
  let active = rows[0]!.map((_, index) => index)
  for (;;) {
    const n = active.length
    const ata = active.map((i) =>
      active.map((j) => rows.reduce((s, r) => s + r[i]! * r[j]!, 0)),
    )
    const atb = active.map((i) =>
      rows.reduce((s, r, k) => s + r[i]! * targets[k]!, 0),
    )
    // Gaussian elimination
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
    const solution = active.map((_, i) => atb[i]! / ata[i]![i]!)
    const negative = solution.findIndex((value) => value < 0)
    if (negative === -1) {
      const coefficients = rows[0]!.map(() => 0)
      active.forEach((index, i) => (coefficients[index] = solution[i]!))
      return coefficients
    }
    active = active.filter((_, i) => i !== negative)
  }
}

const unique = <T>(items: T[], key: (item: T) => string) => {
  const seen = new Set<string>()
  return items.filter((item) => !seen.has(key(item)) && seen.add(key(item)))
}
const distinct = unique(quotes, (q) => `${q.board}|${q.quantity}`)

// Assembly at Flexible: setup + per line + second side + per placement per board.
const assemblyRows: number[][] = []
const assemblyTargets: number[] = []
for (const quote of distinct) {
  const flexible = usOffersByService(quote).flexible
  if (!flexible) continue
  const e = estimateReferenceQuote(quote)
  assemblyRows.push([
    1,
    e.bomLines,
    e.sides === 2 ? 1 : 0,
    e.placements * quote.quantity,
  ])
  assemblyTargets.push(flexible.assembly)
}
const [setup, perBomLine, secondSide, perPlacement] = fitNonNegative(
  assemblyRows,
  assemblyTargets,
)

// Parts: price factor x listed prices x quantity + per BOM line.
const partsRows: number[][] = []
const partsTargets: number[] = []
for (const quote of distinct) {
  const any = quote.offers[0]
  if (!any) continue
  const e = estimateReferenceQuote(quote)
  const listed = quote.input.parts.reduce(
    (sum, part) => sum + estimateCircuithubPartPrice(part).price,
    0,
  )
  partsRows.push([listed * quote.quantity, e.bomLines])
  partsTargets.push(any.parts)
}
const [priceFactor, partsPerBomLine] = fitNonNegative(partsRows, partsTargets)

// Service factors: mean ratio to Flexible (assembly) and to Standard (boards).
const ratio = (pick: (q: CircuithubReferenceQuote) => number | undefined) => {
  const values = distinct
    .map(pick)
    .filter((v): v is number => v !== undefined && Number.isFinite(v))
  return values.reduce((s, v) => s + v, 0) / values.length
}
const assemblyFactor = (
  service: "priority_express" | "priority" | "standard",
) =>
  ratio((q) => {
    const offers = usOffersByService(q)
    return offers[service] && offers.flexible
      ? offers[service]!.assembly / offers.flexible.assembly
      : undefined
  })
const boardFactor = (service: "priority_express" | "priority") =>
  ratio((q) => {
    const offers = usOffersByService(q)
    return offers[service] && offers.standard
      ? offers[service]!.boards / offers.standard.boards
      : undefined
  })

const round = (value: number, digits = 3) => Number(value.toFixed(digits))
console.log("Fitted calibration (copy into CIRCUITHUB_ESTIMATE_CALIBRATION):")
console.log(
  JSON.stringify(
    {
      assembly: {
        setup: round(setup!, 1),
        perBomLine: round(perBomLine!, 2),
        secondSide: round(secondSide!, 1),
        perPlacement: round(perPlacement!),
      },
      assemblyServiceFactor: {
        priority_express: round(assemblyFactor("priority_express"), 2),
        priority: round(assemblyFactor("priority"), 2),
        standard: round(assemblyFactor("standard"), 2),
        flexible: 1,
      },
      boardServiceFactor: {
        priority_express: round(boardFactor("priority_express"), 2),
        priority: round(boardFactor("priority"), 2),
        standard: 1,
        flexible: 1,
      },
      parts: {
        priceFactor: round(priceFactor!, 3),
        perBomLine: round(partsPerBomLine!, 2),
      },
    },
    null,
    2,
  ),
)

console.log("\nCurrent calibration vs real quotes (US offers):")
const pct = (estimate: number, actual: number) =>
  `${(((estimate - actual) / actual) * 100).toFixed(0).padStart(4)}%`
for (const quote of quotes) {
  const e = estimateReferenceQuote(quote)
  const actual = usOffersByService(quote)
  for (const offer of e.offers) {
    const real = actual[offer.service]
    if (!real) continue
    console.log(
      `${quote.board.padEnd(44)} x${String(quote.quantity).padEnd(3)} ${offer.service.padEnd(16)} total ${offer.total.toFixed(0).padStart(6)} vs ${real.total.toFixed(0).padStart(6)} ${pct(offer.total, real.total)}  boards ${pct(offer.boards, real.boards)}  parts ${pct(offer.parts, real.parts)}  assembly ${pct(offer.assembly, real.assembly)}`,
    )
  }
  if (quote.gridProto && e.gridProto.total !== undefined) {
    console.log(
      `${"".padEnd(49)} grid proto      total ${e.gridProto.total.toFixed(0).padStart(6)} vs ${quote.gridProto.total.toFixed(0).padStart(6)} ${pct(e.gridProto.total, quote.gridProto.total)}`,
    )
  }
}
