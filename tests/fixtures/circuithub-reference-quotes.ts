import fs from "node:fs"
import path from "node:path"
import type { CircuithubEstimateInput } from "lib/circuithub/estimate/circuithub-estimate-input"
import {
  type CircuithubEstimateFab,
  type CircuithubEstimateService,
  estimateCircuithubQuote,
} from "lib/circuithub/estimate/estimate-circuithub-quote"

/** A real CircuitHub quote kept to calibrate and test the estimate. */
export interface CircuithubReferenceQuote {
  board: string
  quotedOn: string
  revisionId?: number
  quantity: number
  input: CircuithubEstimateInput
  /**
   * "circuithub-bom": the input was read from CircuitHub's BOM rather than
   * circuit JSON, so its part details are rough and part prices aren't checked.
   */
  inputSource?: "circuithub-bom"
  offers: {
    service: string
    shipDate: { earliest: string; latest: string }
    fabricationCountry: string | null
    boards: number
    parts: number
    assembly: number
    total: number
  }[]
  gridProto: { status: string; total: number; priorityTotal: number } | null
}

type ReferenceOffer = CircuithubReferenceQuote["offers"][number]

const FIXTURE = path.join(import.meta.dir, "circuithub-reference-quotes.json")

export const loadCircuithubReferenceQuotes = (): CircuithubReferenceQuote[] => {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf-8"))
  return fixture.quotes.map((quote: any) => {
    const { inputSource, ...input } = fixture.boards[quote.input]
    return { ...quote, input, inputSource }
  })
}

/**
 * The real quote's offers, named like the estimate's: boards made in the US
 * (fabricationCountry "US") or overseas, and of two US Priority offers the
 * earlier one is `priority_express`. Of two overseas Priority offers, the
 * later one is the one the estimate models (the earlier one isn't always
 * offered).
 */
export const offersByFabAndService = (quote: CircuithubReferenceQuote) => {
  const result: Record<
    CircuithubEstimateFab,
    Partial<Record<CircuithubEstimateService, ReferenceOffer>>
  > = { us: {}, overseas: {} }
  for (const fab of ["us", "overseas"] as const) {
    const offers = quote.offers.filter(
      (offer) => (offer.fabricationCountry === "US") === (fab === "us"),
    )
    const priority = offers
      .filter((offer) => offer.service === "priority")
      .sort((a, b) => a.shipDate.earliest.localeCompare(b.shipDate.earliest))
    result[fab].standard = offers.find((offer) => offer.service === "standard")
    result[fab].flexible = offers.find((offer) => offer.service === "flexible")
    if (fab === "us") {
      if (priority.length >= 2) {
        result.us.priority_express = priority[0]
        result.us.priority = priority[1]
      } else {
        result.us.priority = priority[0]
      }
    } else {
      result.overseas.priority = priority.at(-1)
    }
  }
  return result
}

export const estimateReferenceQuote = (quote: CircuithubReferenceQuote) =>
  estimateCircuithubQuote(quote.input, { quantity: quote.quantity })
