import type { ResultType } from "lib/types/eecircuit-engine"

export const resultToCsv = (result: ResultType): string => {
  if (result.dataType === "real") {
    const headers = result.variableNames.join(",")
    const rows: string[] = []
    for (let i = 0; i < result.numPoints; i++) {
      const row = result.data.map((d) => d.values[i]).join(",")
      rows.push(row)
    }
    return [headers, ...rows].join("\n")
  }
  // complex
  const headers = result.variableNames
    .flatMap((v) => [`${v}_real`, `${v}_img`])
    .join(",")
  const rows: string[] = []
  for (let i = 0; i < result.numPoints; i++) {
    const row = result.data
      .flatMap((d) => [d.values[i].real, d.values[i].img])
      .join(",")
    rows.push(row)
  }
  return [headers, ...rows].join("\n")
}
