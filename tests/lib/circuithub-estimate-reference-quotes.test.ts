import { expect, test } from "bun:test"
import {
  estimateReferenceQuote,
  loadCircuithubReferenceQuotes,
  offersByFabAndService,
} from "tests/fixtures/circuithub-reference-quotes"

const error = (estimate: number, actual: number) =>
  Math.abs(estimate - actual) / actual

test("the offline CircuitHub estimate stays close to real CircuitHub quotes", () => {
  const quotes = loadCircuithubReferenceQuotes()
  expect(quotes.length).toBeGreaterThanOrEqual(28)
  const errors: number[] = []
  for (const quote of quotes) {
    const estimate = estimateReferenceQuote(quote)
    const actual = offersByFabAndService(quote)
    for (const offer of estimate.offers) {
      const real = actual[offer.fab][offer.service]
      if (!real) continue
      const label = `${quote.board} x${quote.quantity} ${offer.fab} ${offer.service}`
      // Inputs read from CircuitHub's BOM have rough part details: check
      // their boards and assembly, with CircuitHub's parts price.
      const fromBom = quote.inputSource === "circuithub-bom"
      const total = fromBom
        ? offer.total - offer.parts + real.parts
        : offer.total
      errors.push(error(total, real.total))
      // Every offer's total within 15% of CircuitHub's price.
      expect({ label, ok: error(total, real.total) <= 0.15 }).toEqual({
        label,
        ok: true,
      })
      if (!fromBom) {
        expect({ label, ok: error(offer.parts, real.parts) <= 0.15 }).toEqual({
          label,
          ok: true,
        })
      }
    }
    if (quote.gridProto) {
      expect(estimate.gridProto.eligible).toBe(true)
      expect(
        error(estimate.gridProto.total!, quote.gridProto.total),
      ).toBeLessThanOrEqual(0.15)
    }
  }
  // And within 5% on average (root mean square).
  const rms = Math.sqrt(
    errors.reduce((sum, e) => sum + e * e, 0) / errors.length,
  )
  expect(rms).toBeLessThanOrEqual(0.05)
})
