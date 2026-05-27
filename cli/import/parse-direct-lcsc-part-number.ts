import { getJlcpcbPartNumber } from "./jlcpcb-part-number"

export const parseDirectLcscPartNumber = (query: string): string | null => {
  const directPartMatch = query.trim().match(/^(?:jlcpcb:)?c?(\d+)$/i)
  if (!directPartMatch) return null
  return getJlcpcbPartNumber(directPartMatch[1])
}
