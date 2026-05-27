const normalizeJlcpcbPartNumber = (partNumber: number | string) =>
  String(partNumber)
    .trim()
    .replace(/^jlcpcb:/i, "")
    .replace(/^c/i, "")

export const getJlcpcbPartNumber = (partNumber: number | string) =>
  `C${normalizeJlcpcbPartNumber(partNumber)}`

export const getJlcpcbPartIdentifier = (partNumber: number | string) =>
  `jlcpcb:${getJlcpcbPartNumber(partNumber)}`
