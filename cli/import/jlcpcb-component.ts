export type JlcpcbComponentSearchResult = {
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

export const getJlcpcbComponentDisplayParts = (
  comp: Pick<JlcpcbComponentSearchResult, "mfr" | "description">,
) => {
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

export const getJlcpcbComponentDisplayText = (
  comp: Pick<JlcpcbComponentSearchResult, "mfr" | "description">,
) => getJlcpcbComponentDisplayParts(comp).join(" - ")
