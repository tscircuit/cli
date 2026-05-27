export type JlcpcbSearchResult = {
  lcsc: number | string
  mfr?: string | null
  package?: string | null
  description?: string | null
  stock?: number | null
  price?: number | null
}

const normalizeDisplayText = (value?: string | null) => value?.trim() ?? ""

const hasSameDisplayText = (left?: string | null, right?: string | null) =>
  normalizeDisplayText(left).toLocaleLowerCase() ===
  normalizeDisplayText(right).toLocaleLowerCase()

const getJlcpcbDisplayDetails = (comp: JlcpcbSearchResult) => {
  const manufacturer = normalizeDisplayText(comp.mfr)
  const description = normalizeDisplayText(comp.description)

  if (
    manufacturer &&
    description &&
    hasSameDisplayText(manufacturer, description)
  ) {
    return [manufacturer]
  }

  return [manufacturer, description].filter(Boolean)
}

const normalizeJlcpcbPartNumber = (lcsc: number | string) => {
  const rawPartNumber = String(lcsc).trim()

  return rawPartNumber.replace(/^jlcpcb:/i, "").replace(/^c/i, "")
}

export const getJlcpcbSearchResultIdentifier = (lcsc: number | string) =>
  `jlcpcb:C${normalizeJlcpcbPartNumber(lcsc)}`

export const formatJlcpcbSearchResult = (
  comp: JlcpcbSearchResult,
  idx: number,
) => {
  const detailParts = getJlcpcbDisplayDetails(comp)
  const stockSuffix =
    typeof comp.stock === "number"
      ? ` (stock: ${comp.stock.toLocaleString("en-US")})`
      : ""

  return `${idx + 1}. ${getJlcpcbSearchResultIdentifier(comp.lcsc)}${
    detailParts.length ? ` - ${detailParts.join(" - ")}` : ""
  }${stockSuffix}`
}
