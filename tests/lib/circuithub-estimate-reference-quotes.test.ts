import { expect, test } from "bun:test"
import {
  estimateReferenceQuote,
  loadCircuithubReferenceQuotes,
  usOffersByService,
} from "tests/fixtures/circuithub-reference-quotes"

const error = (estimate: number, actual: number) =>
  Math.abs(estimate - actual) / actual

test("the offline CircuitHub estimate stays close to real CircuitHub quotes", () => {
  const quotes = loadCircuithubReferenceQuotes()
  expect(quotes.length).toBeGreaterThanOrEqual(7)
  for (const quote of quotes) {
    const estimate = estimateReferenceQuote(quote)
    const actual = usOffersByService(quote)
    for (const offer of estimate.offers) {
      const real = actual[offer.service]
      if (!real) continue
      const label = `${quote.board} x${quote.quantity} ${offer.service}`
      // Totals: within 15% of CircuitHub's price for every US offer.
      expect({ label, ok: error(offer.total, real.total) <= 0.15 }).toEqual({
        label,
        ok: true,
      })
      // Parts and Flexible assembly are the calibrated pieces: within 15%.
      expect({ label, ok: error(offer.parts, real.parts) <= 0.15 }).toEqual({
        label,
        ok: true,
      })
    }
    if (quote.gridProto) {
      expect(estimate.gridProto.eligible).toBe(true)
      expect(
        error(estimate.gridProto.total!, quote.gridProto.total),
      ).toBeLessThanOrEqual(0.12)
    }
  }
})
