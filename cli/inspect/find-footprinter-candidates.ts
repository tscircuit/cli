import { circuitJsonToFootprinter } from "lib/shared/circuit-json-to-footprinter"
import type { LoadedFootprint } from "./footprint/load-footprint-for-inspection"

export const findFootprinterCandidates = ({
  circuitJson,
  input,
}: LoadedFootprint) => {
  if (
    !circuitJson.some(
      (e) => e.type === "pcb_smtpad" || e.type === "pcb_plated_hole",
    )
  )
    return []
  return circuitJsonToFootprinter(circuitJson, { sourceHints: [input] })
    .candidates
}
