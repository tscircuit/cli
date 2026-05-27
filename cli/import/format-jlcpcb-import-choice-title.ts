import {
  type JlcpcbComponentSearchResult,
  getJlcpcbComponentDisplayText,
} from "./jlcpcb-component"
import { getJlcpcbPartIdentifier } from "./jlcpcb-part-number"

export const formatJlcpcbImportChoiceTitle = (
  comp: Pick<JlcpcbComponentSearchResult, "lcsc" | "mfr" | "description">,
) => {
  const detailText = getJlcpcbComponentDisplayText(comp)

  return `${getJlcpcbPartIdentifier(comp.lcsc)}${
    detailText ? ` - ${detailText}` : ""
  }`
}
