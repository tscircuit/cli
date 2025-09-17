import type {
  ResultType,
  RealDataType,
  ComplexDataType,
} from "lib/types/eecircuit-engine"

export const resultToCsv = (result: ResultType): string => {
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
    const headers = uniqueHeaders.join(",")
    const rows: string[] = []
    for (let i = 0; i < result.numPoints; i++) {
      const row = (uniqueData as RealDataType[])
        .map((d) => d.values[i])
        .join(",")
      rows.push(row)
    }
    return [headers, ...rows].join("\n")
  }
  // complex
  const headers = uniqueHeaders
    .flatMap((v) => [`${v}_real`, `${v}_img`])
    .join(",")
  const rows: string[] = []
  for (let i = 0; i < result.numPoints; i++) {
    const row = (uniqueData as ComplexDataType[])
      .flatMap((d) => [d.values[i].real, d.values[i].img])
      .join(",")
    rows.push(row)
  }
  return [headers, ...rows].join("\n")
}
