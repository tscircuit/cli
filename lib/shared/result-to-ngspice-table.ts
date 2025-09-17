import type {
  ComplexDataType,
  RealDataType,
  ResultType,
} from "lib/types/eecircuit-engine"

const formatNumber = (n: number): string => {
  return n.toExponential(6)
}

function formatRows(rows: string[][]): string {
  if (rows.length === 0) return ""
  const colWidths = Array(rows[0].length).fill(0)

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      colWidths[i] = Math.max(colWidths[i], row[i].length)
    }
  }

  return rows
    .map((row) => row.map((cell, i) => cell.padEnd(colWidths[i])).join("  "))
    .join("\n")
}

export const resultToNgspiceTable = (result: ResultType): string => {
  const uniqueHeaders: string[] = []
  const uniqueData: (RealDataType | ComplexDataType)[] = []
  const seenHeaders = new Set<string>()

  result.variableNames.forEach((header, index) => {
    if (!seenHeaders.has(header)) {
      seenHeaders.add(header)
      uniqueHeaders.push(header)
      uniqueData.push(result.data[index])
    }
  })

  if (result.dataType === "real") {
    const headers = ["Index", ...uniqueHeaders]
    const dataRows: string[][] = []
    for (let i = 0; i < result.numPoints; i++) {
      const row = [
        i.toString(),
        ...(uniqueData as RealDataType[]).map((d) => formatNumber(d.values[i])),
      ]
      dataRows.push(row)
    }
    return formatRows([headers, ...dataRows])
  }
  // complex
  const headers = [
    "Index",
    ...uniqueHeaders.flatMap((v) => [`${v}_real`, `${v}_img`]),
  ]
  const dataRows: string[][] = []
  for (let i = 0; i < result.numPoints; i++) {
    const row = [
      i.toString(),
      ...(uniqueData as ComplexDataType[]).flatMap((d) => [
        formatNumber(d.values[i].real),
        formatNumber(d.values[i].img),
      ]),
    ]
    dataRows.push(row)
  }
  return formatRows([headers, ...dataRows])
}
