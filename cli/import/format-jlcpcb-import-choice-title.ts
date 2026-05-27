import {
  type JlcpcbComponentSearchResult,
  getJlcpcbComponentDisplayText,
} from "lib/shared/jlcpcb-component"
import { getJlcpcbPartIdentifier } from "lib/shared/jlcpcb-part-number"

export const formatJlcpcbImportChoiceTitle = (
  comp: Pick<JlcpcbComponentSearchResult, "lcsc" | "mfr" | "description">,
) => {
  const detailText = getJlcpcbComponentDisplayText(comp)

  return `${getJlcpcbPartIdentifier(comp.lcsc)}${
    detailText ? ` - ${detailText}` : ""
  }`
}
