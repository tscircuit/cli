import fs from "node:fs"
import path from "node:path"
import type { CircuithubEstimateInput } from "lib/circuithub/estimate/circuithub-estimate-input"
import {
  type CircuithubEstimateService,
  estimateCircuithubQuote,
} from "lib/circuithub/estimate/estimate-circuithub-quote"

/** A real CircuitHub quote kept to calibrate and test the estimate. */
export interface CircuithubReferenceQuote {
  board: string
  quotedOn: string
  quantity: number
  input: CircuithubEstimateInput
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

const FIXTURE = path.join(import.meta.dir, "circuithub-reference-quotes.json")

export const loadCircuithubReferenceQuotes = (): CircuithubReferenceQuote[] => {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf-8"))
  return fixture.quotes.map((quote: any) => ({
    ...quote,
    input: fixture.boards[quote.input],
  }))
}

/**
 * The real quote's US offers, named like the estimate's services: of two
 * Priority offers, the earlier ship date is `priority_express`.
 */
export const usOffersByService = (quote: CircuithubReferenceQuote) => {
  const us = quote.offers.filter(
    (offer) =>
      offer.fabricationCountry !== null ||
      quote.offers.every((o) => o.fabricationCountry === null),
  )
  const priority = us
    .filter((offer) => offer.service === "priority")
    .sort((a, b) => a.shipDate.earliest.localeCompare(b.shipDate.earliest))
  const byService: Partial<
    Record<
      CircuithubEstimateService,
      CircuithubReferenceQuote["offers"][number]
    >
  > = {
    standard: us.find((offer) => offer.service === "standard"),
    flexible: us.find((offer) => offer.service === "flexible"),
  }
  if (priority.length >= 2) {
    byService.priority_express = priority[0]
    byService.priority = priority[1]
  } else if (priority.length === 1) {
    byService.priority = priority[0]
  }
  return byService
}

export const estimateReferenceQuote = (quote: CircuithubReferenceQuote) =>
  estimateCircuithubQuote(quote.input, { quantity: quote.quantity })
