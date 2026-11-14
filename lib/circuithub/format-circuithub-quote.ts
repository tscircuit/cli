import type { CircuithubOffer, CircuithubQuote } from "./circuithub-api"
import type { CircuithubQuoteResult } from "./create-circuithub-quote"

const money = (amount: number) =>
  `${amount < 0 ? "-" : ""}$${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const lineItem = (offer: CircuithubOffer, type: string) =>
  offer.price.lineItems
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + Number(item.amount), 0)

const discountTotal = (offer: CircuithubOffer) =>
  offer.price.discounts.reduce(
    (sum, discount) => sum + Number(discount.amount ?? 0),
    0,
  )

const formatTable = (rows: string[][], rightAligned: Set<number>) => {
  const widths = rows[0]!.map((_, column) =>
    Math.max(...rows.map((row) => row[column]!.length)),
  )
  return rows.map((row) =>
    row
      .map((cell, column) =>
        rightAligned.has(column)
          ? cell.padStart(widths[column]!)
          : cell.padEnd(widths[column]!),
      )
      .join("  ")
      .trimEnd(),
  )
}

const formatShipDate = (offer: CircuithubOffer) => {
  const { earliest, latest } = offer.shipDate ?? {}
  if (!earliest) return "-"
  return latest && latest !== earliest ? `${earliest}..${latest}` : earliest
}

const formatQuote = (
  quote: CircuithubQuote,
  bomRefsById: Map<number, string[]>,
) => {
  const lines: string[] = []
  const expires = quote.expiresAt
    ? `, expires ${quote.expiresAt.slice(0, 16).replace("T", " ")} UTC`
    : ""
  lines.push(
    `${quote.quantity} board${quote.quantity === 1 ? "" : "s"} (quote ${quote.id}${expires})`,
  )
  const offers = [...quote.offers].sort(
    (a, b) =>
      Number(a.price.manufacturingTotal) - Number(b.price.manufacturingTotal),
  )
  if (offers.length === 0) {
    lines.push("  No offers")
  } else {
    const otherTypes = new Set(
      offers.flatMap((offer) =>
        offer.price.lineItems
          .map((item) => item.type)
          .filter((type) => !["boards", "parts", "assembly"].includes(type)),
      ),
    )
    const rows = [
      [
        "Service",
        "Fab",
        "Ships",
        "Boards",
        "Parts",
        "Assembly",
        ...(otherTypes.size > 0 ? ["Other"] : []),
        "Discounts",
        "Total",
        "Per board",
      ],
      ...offers.map((offer) => {
        const discounts = discountTotal(offer)
        return [
          offer.service,
          offer.fabricationCountry ?? "-",
          formatShipDate(offer),
          money(lineItem(offer, "boards")),
          money(lineItem(offer, "parts")),
          money(lineItem(offer, "assembly")),
          ...(otherTypes.size > 0
            ? [
                money(
                  [...otherTypes].reduce(
                    (sum, type) => sum + lineItem(offer, type),
                    0,
                  ),
                ),
              ]
            : []),
          discounts ? money(-discounts) : "-",
          money(Number(offer.price.manufacturingTotal)),
          offer.price.manufacturingUnitPrice
            ? money(Number(offer.price.manufacturingUnitPrice))
            : "-",
        ]
      }),
    ]
    const columnCount = rows[0]!.length
    const rightAligned = new Set(
      Array.from({ length: columnCount - 3 }, (_, index) => index + 3),
    )
    lines.push(...formatTable(rows, rightAligned).map((row) => `  ${row}`))
    const discountLabels = [
      ...new Set(
        offers.flatMap((offer) =>
          offer.price.discounts.map((discount) =>
            String(discount.label ?? discount.type),
          ),
        ),
      ),
    ]
    if (discountLabels.length > 0) {
      lines.push(`  Discounts applied: ${discountLabels.join(", ")}`)
    }
    const excludes = offers[0]!.price.excludes
    if (Array.isArray(excludes) && excludes.length > 0) {
      lines.push(`  Prices exclude ${excludes.join(" and ")}`)
    }
  }
  for (const blocker of quote.blockers ?? []) {
    const refs = (blocker.bomLineIds ?? []).flatMap(
      (id) => bomRefsById.get(id) ?? [`BOM line ${id}`],
    )
    lines.push(
      `  Blocker: ${blocker.code}${refs.length > 0 ? ` (${refs.join(", ")})` : ""}`,
    )
  }
  for (const feedback of quote.designFeedback ?? []) {
    lines.push(
      `  Design feedback (${feedback.type}): ${feedback.summary ?? ""}`,
    )
    for (const reason of feedback.reasons ?? []) {
      lines.push(`    - ${reason}`)
    }
  }
  if (offers[0]?.checkoutUrl) {
    lines.push(`  Review and order (cheapest offer): ${offers[0].checkoutUrl}`)
  }
  return lines
}

export const formatCircuithubQuoteResult = (result: CircuithubQuoteResult) => {
  const lines: string[] = []
  const { bom } = result
  if (result.projectId !== undefined) {
    lines.push(
      `CircuitHub project ${result.projectId}, revision ${result.revisionId}${result.workspace ? ` (workspace ${result.workspace})` : ""}`,
    )
  }
  if (bom.missingMpns.length > 0) {
    lines.push(
      `No manufacturer part number in the design: ${bom.missingMpns.join(", ")}`,
    )
  }
  if (bom.unknownMpns.length > 0) {
    lines.push(
      `Not found in CircuitHub's catalog: ${bom.unknownMpns.join(", ")}`,
    )
  }

  const bomRefsById = new Map<number, string[]>()
  if (result.circuithubBom) {
    const unresolved = result.circuithubBom.bomLines.filter(
      (line) => line.status !== "resolved",
    )
    for (const line of result.circuithubBom.bomLines) {
      bomRefsById.set(line.id, line.referenceDesignators)
    }
    const resolvedCount =
      result.circuithubBom.bomLines.length - unresolved.length
    lines.push(
      `BOM: ${resolvedCount}/${result.circuithubBom.bomLines.length} lines matched to a part by CircuitHub${
        unresolved.length > 0
          ? `; unmatched: ${unresolved.map((line) => line.referenceDesignators.join(",")).join("; ")}`
          : ""
      }`,
    )
  }

  const spec = result.board?.spec as Record<string, any> | undefined
  if (spec) {
    const parts = [
      spec.widthMM && spec.lengthMM
        ? `${spec.widthMM} x ${spec.lengthMM} mm`
        : null,
      spec.numLayers ? `${spec.numLayers} layers` : null,
      spec.minTraceWidthMM ? `min trace ${spec.minTraceWidthMM}mm` : null,
      spec.minPitchMM ? `min gap ${spec.minPitchMM}mm` : null,
      spec.minHoleSizeMM ? `min drill ${spec.minHoleSizeMM}mm` : null,
    ].filter(Boolean)
    lines.push(
      `Board as measured by CircuitHub${result.camReady ? "" : " (preliminary, CAM not finished)"}: ${parts.join(", ")}`,
    )
  }
  for (const message of result.board?.messages ?? []) {
    lines.push(`  ${message.level}: ${message.message}`)
  }

  for (const quote of result.quotes) {
    lines.push("", ...formatQuote(quote, bomRefsById))
  }
  return lines.join("\n")
}

export const formatCircuithubBomTable = (result: CircuithubQuoteResult) => {
  const rows = [
    ["Refs", "Manufacturer", "MPN", "Supplier PN", "Value"],
    ...result.bom.rows.map((row) => [
      row.referenceDesignators.join(","),
      row.manufacturer || "-",
      row.mpn || "-",
      row.supplierPartNumber
        ? `${row.supplier} ${row.supplierPartNumber}`
        : "-",
      row.value || "-",
    ]),
  ]
  return formatTable(rows, new Set()).join("\n")
}
