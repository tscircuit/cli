import type {
  FootprintBounds,
  FootprintInspection,
  FootprintPadInspection,
} from "./get-footprint-inspection"

const formatBounds = (bounds: FootprintBounds) =>
  `${bounds.width} x ${bounds.height} mm (x ${bounds.minX} to ${bounds.maxX}, y ${bounds.minY} to ${bounds.maxY})`

const formatPadCounts = (padCounts: FootprintInspection["padCounts"]) => {
  const parts: string[] = []
  const add = (count: number, singular: string, plural: string) => {
    if (count > 0) parts.push(`${count} ${count === 1 ? singular : plural}`)
  }
  add(padCounts.smtpad, "SMT pad", "SMT pads")
  add(padCounts.plated_hole, "plated hole", "plated holes")
  add(padCounts.hole, "unplated hole", "unplated holes")
  return parts.join(", ")
}

/** Flags that are off say nothing about the footprint, so leave them out. */
const formatParameters = (parameters: Record<string, unknown>) =>
  Object.entries(parameters)
    .filter(
      ([key, value]) =>
        key !== "string" && value !== false && value !== undefined,
    )
    .map(
      ([key, value]) =>
        `${key}=${typeof value === "object" ? JSON.stringify(value) : value}`,
    )
    .join(" ")

const formatHole = (pad: FootprintPadInspection) => {
  if (!pad.hole) return "-"
  return pad.hole.width === pad.hole.height
    ? String(pad.hole.width)
    : `${pad.hole.width} x ${pad.hole.height}`
}

const formatTable = (rows: string[][]) => {
  const columnWidths = rows[0]!.map((_, columnIndex) =>
    Math.max(...rows.map((row) => row[columnIndex]!.length)),
  )
  return rows
    .map((row) =>
      row
        .map((cell, columnIndex) => cell.padEnd(columnWidths[columnIndex]!))
        .join("  ")
        .trimEnd(),
    )
    .join("\n")
}

export const formatFootprintInspection = (inspection: FootprintInspection) => {
  const lines = [inspection.input, `source: ${inspection.sourceDescription}`]
  if (inspection.parameters) {
    lines.push(`parameters: ${formatParameters(inspection.parameters)}`)
  }
  lines.push(`pads: ${formatPadCounts(inspection.padCounts)}`)
  if (inspection.copperBounds) {
    lines.push(`copper: ${formatBounds(inspection.copperBounds)}`)
  }
  if (inspection.courtyardBounds) {
    lines.push(`courtyard: ${formatBounds(inspection.courtyardBounds)}`)
  }

  const rows = [
    ["pin", "kind", "shape", "x", "y", "width", "height", "hole", "layers"],
    ...inspection.pads.map((pad) => [
      pad.pin.join(",") || "-",
      pad.kind,
      pad.shape,
      String(pad.x),
      String(pad.y),
      String(pad.width),
      String(pad.height),
      formatHole(pad),
      pad.layers.join(","),
    ]),
  ]

  return [
    lines.join("\n"),
    formatTable(rows),
    "Millimetres in the footprint's own frame (+x right, +y up), before pcbRotation.",
  ].join("\n\n")
}
