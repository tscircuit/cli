import type {
  CircuithubEstimate,
  CircuithubEstimateOffer,
} from "./estimate-circuithub-quote"

const money = (amount: number) =>
  `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const SERVICE_LABELS: Record<CircuithubEstimateOffer["service"], string> = {
  priority_express: "priority (fastest)",
  priority: "priority",
  standard: "standard",
  flexible: "flexible",
}

const formatLeadTime = ([min, max]: [number, number]) =>
  min === max ? `~${min} days` : `${min}–${max} days`

/** Columns padded to their widest cell; prices right-aligned. */
const formatTable = (header: string[], rows: string[][]) => {
  const cells = [header, ...rows]
  const widths = header.map((_, column) =>
    Math.max(...cells.map((row) => row[column]!.length)),
  )
  const formatRow = (row: string[]) =>
    `  ${row
      .map((cell, column) =>
        column >= 2
          ? cell.padStart(widths[column]!)
          : cell.padEnd(widths[column]!),
      )
      .join("  ")
      .trimEnd()}`
  return [
    formatRow(header),
    `  ${widths.map((width) => "─".repeat(width)).join("  ")}`,
    ...rows.map(formatRow),
  ]
}

export const formatCircuithubEstimate = (estimate: CircuithubEstimate) => {
  const { board, quantity } = estimate
  const lines = [
    "CircuitHub estimate (offline: no CircuitHub account or network used)",
    "",
    `  Board   ${Number(board.widthMm.toFixed(2))} × ${Number(board.heightMm.toFixed(2))} mm, ${board.layers} layers`,
    `  Parts   ${estimate.placements} placed (${estimate.bomLines} BOM lines), ${estimate.sides === 2 ? "on both sides" : "on one side"}; ${estimate.partsPriced.reference} at reference prices, ${estimate.partsPriced.estimated} priced by type and package`,
    "  Prices  estimated for CircuitHub's US Grid line, excluding shipping and tax.",
    "          Checked against real quotes to about ±15%; run `tsci quote create --circuithub` for a real quote.",
    ...estimate.notes.map((note) => `  Note    ${note}`),
    "",
    `${quantity} board${quantity === 1 ? "" : "s"}`,
  ]
  const rows = estimate.offers.map((offer) => [
    SERVICE_LABELS[offer.service],
    formatLeadTime(offer.leadTimeDays),
    money(offer.boards),
    money(offer.parts),
    money(offer.assembly),
    money(offer.total),
    money(offer.perBoard),
  ])
  const gridProto = estimate.gridProto
  if (gridProto.total !== undefined) {
    const express = estimate.offers.find(
      (offer) => offer.service === "priority_express",
    )!
    rows.push([
      "Grid Proto",
      formatLeadTime(express.leadTimeDays),
      money(gridProto.boards!),
      money(gridProto.parts!),
      money(gridProto.assembly!),
      money(gridProto.total),
      money(gridProto.perBoard!),
    ])
  }
  lines.push(
    ...formatTable(
      [
        "Service",
        "Ships in",
        "Boards",
        "Parts",
        "Assembly",
        "Total",
        "Per board",
      ],
      rows,
    ),
  )
  if (estimate.gridProto.eligible) {
    lines.push(
      "  Grid Proto: 75% off boards and assembly at Priority, parts at full price; offered only while CircuitHub has Grid Proto capacity",
    )
  } else {
    lines.push(`  No Grid Proto: ${estimate.gridProto.reasons.join("; ")}`)
  }
  return lines.join("\n")
}
