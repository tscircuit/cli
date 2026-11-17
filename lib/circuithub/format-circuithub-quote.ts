import type {
  CircuithubBomLine,
  CircuithubOffer,
  CircuithubQuote,
} from "./circuithub-api"
import type { CircuithubQuoteResult } from "./create-circuithub-quote"

const money = (amount: number) =>
  `${amount < 0 ? "-" : ""}$${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const discountTotal = (offer: CircuithubOffer) =>
  offer.price.discounts.reduce(
    (sum, discount) => sum + Number(discount.amount ?? 0),
    0,
  )

const total = (offer: CircuithubOffer) => Number(offer.price.manufacturingTotal)

const sortByTotal = (offers: CircuithubOffer[]) =>
  [...offers].sort((a, b) => total(a) - total(b))

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** "2026-12-10".."2026-12-24" -> "Dec 10–24"; "2026-11-30" -> "Nov 30". */
const formatShipDate = (offer: CircuithubOffer) => {
  const { earliest, latest } = offer.shipDate ?? {}
  if (!earliest) return "-"
  const parse = (date: string) => {
    const [, month, day] = date.split("-").map(Number)
    return { month: MONTHS[(month ?? 1) - 1] ?? "", day: String(day) }
  }
  const start = parse(earliest)
  if (!latest || latest === earliest) return `${start.month} ${start.day}`
  const end = parse(latest)
  return start.month === end.month
    ? `${start.month} ${start.day}–${end.day}`
    : `${start.month} ${start.day}–${end.month} ${end.day}`
}

/**
 * Lay rows out as columns. A row of `null` is a separator line between
 * quantities; columns in `rightAligned` (the prices) are right-aligned.
 */
const formatTable = (
  header: string[],
  rows: (string[] | null)[],
  rightAligned: Set<number>,
) => {
  const cells = [header, ...rows.filter((row): row is string[] => !!row)]
  const widths = header.map((_, column) =>
    Math.max(...cells.map((row) => row[column]!.length)),
  )
  const formatRow = (row: string[]) =>
    `  ${row
      .map((cell, column) =>
        rightAligned.has(column)
          ? cell.padStart(widths[column]!)
          : cell.padEnd(widths[column]!),
      )
      .join("  ")
      .trimEnd()}`
  const rule = `  ${widths.map((width) => "─".repeat(width)).join("  ")}`
  return [
    formatRow(header),
    rule,
    ...rows.map((row) => (row ? formatRow(row) : rule)),
  ]
}

/**
 * Do-not-place lines (holes, bare test pads) need no part. CircuitHub marks
 * them `not_fitted`, and each placement has `dnp: true`.
 */
const isNotFitted = (line: CircuithubBomLine) =>
  line.status === "not_fitted" ||
  ((line.placements?.length ?? 0) > 0 &&
    line.placements!.every((placement) => placement.dnp))

const formatQuoteRows = (quote: CircuithubQuote): string[][] =>
  sortByTotal(quote.offers).map((offer) => {
    const discount = discountTotal(offer)
    return [
      offer.service,
      offer.fabricationCountry ?? "-",
      formatShipDate(offer),
      discount ? money(-discount) : "-",
      money(total(offer)),
      offer.price.manufacturingUnitPrice
        ? money(Number(offer.price.manufacturingUnitPrice))
        : "-",
    ]
  })

export const formatCircuithubQuoteResult = (result: CircuithubQuoteResult) => {
  const lines: string[] = []
  const preliminary = !result.camReady && result.quotes.length > 0

  if (result.projectId !== undefined) {
    lines.push(
      `CircuitHub quote: project ${result.projectId}, revision ${result.revisionId}${result.workspace ? ` (workspace ${result.workspace})` : ""}`,
      "",
    )
  }

  // Counts only: listing every part would bury the prices on a big board.
  if (result.circuithubBom) {
    const bomLines = result.circuithubBom.bomLines
    const fitted = bomLines.filter((line) => !isNotFitted(line))
    const matched = fitted.filter((line) => line.status === "resolved").length
    const notFittedCount = bomLines.length - fitted.length
    lines.push(
      `  Parts   ${matched} of ${fitted.length} matched by CircuitHub${
        notFittedCount > 0 ? ` (${notFittedCount} do-not-place skipped)` : ""
      }`,
    )
  }

  const spec = result.board?.spec as Record<string, any> | undefined
  if (spec) {
    const size =
      spec.widthMM && spec.lengthMM
        ? `${spec.widthMM} × ${spec.lengthMM} mm`
        : null
    const measurements = preliminary
      ? ["PRELIMINARY: CircuitHub is still measuring it"]
      : [
          spec.minTraceWidthMM ? `trace ${spec.minTraceWidthMM} mm` : null,
          spec.minPitchMM ? `gap ${spec.minPitchMM} mm` : null,
          spec.minHoleSizeMM ? `drill ${spec.minHoleSizeMM} mm` : null,
        ]
    lines.push(
      `  Board   ${[size, spec.numLayers ? `${spec.numLayers} layers` : null, ...measurements].filter(Boolean).join(", ")}`,
    )
  }
  // Before the board is measured, CircuitHub's messages describe its
  // placeholder values (gap 0, no drill), not the design.
  if (!preliminary) {
    for (const message of result.board?.messages ?? []) {
      lines.push(`          ${message.level}: ${message.message}`)
    }
  }

  if (result.quotes.length > 0) {
    const expires = result.quotes[0]!.expiresAt
    lines.push(
      `  Prices  exclude shipping and tax${expires ? `; valid until ${expires.slice(0, 16).replace("T", " ")} UTC` : ""}`,
    )
    const hasGridProto = result.quotes.some((quote) =>
      quote.offers.some((offer) =>
        offer.price.discounts.some(
          (discount) => discount.type === "grid_proto",
        ),
      ),
    )
    if (hasGridProto) lines.push("  Discount is CircuitHub's Grid Proto price")

    // One table per quantity, with that quantity's notes and order link.
    for (const quote of result.quotes) {
      lines.push(
        "",
        `${quote.quantity} board${quote.quantity === 1 ? "" : "s"}`,
        ...formatTable(
          ["Service", "Made in", "Ships", "Discount", "Total", "Per board"],
          formatQuoteRows(quote),
          new Set([3, 4, 5]),
        ),
      )
      for (const blocker of quote.blockers ?? []) {
        const count = blocker.bomLineIds?.length ?? 0
        lines.push(
          blocker.code === "part_not_chosen" && count > 0
            ? `  Blocked: ${count} part${count === 1 ? "" : "s"} not chosen; choose ${count === 1 ? "it" : "them"} on the order page`
            : `  Blocked: ${blocker.code.replaceAll("_", " ")}; see the order page`,
        )
      }
      if (!preliminary) {
        for (const feedback of quote.designFeedback ?? []) {
          if (feedback.type !== "grid_proto") continue
          const reason = feedback.reasons?.[0]?.split(/(?<=\.) /)[0]
          lines.push(`  No Grid Proto discount${reason ? `: ${reason}` : ""}`)
        }
      }
      const cheapest = sortByTotal(quote.offers)[0]
      if (cheapest?.checkoutUrl) {
        lines.push(`  Order (cheapest): ${cheapest.checkoutUrl}`)
      }
    }
  }

  if (preliminary) {
    lines.push(
      "",
      "PRELIMINARY: CircuitHub is still measuring the board (usually ~1.5 min after upload), so these prices may be wrong and miss Grid Proto.",
      `For final prices run: tsci quote refresh --circuithub ${result.revisionId ?? ""}`.trimEnd(),
    )
  }
  return lines.join("\n")
}
