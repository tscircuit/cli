import type { FootprinterDiscoveryCandidate } from "lib/shared/circuit-json-to-footprinter"
import type { ImportedCadComponent } from "./add-cad-model-to-tsx"
import type { ImportedFootprintConversion } from "./footprinter/convert-imported-footprint-to-footprinter"

export type Imported3dModelInfo =
  | { isAvailable: true; source: "cad-model" }
  | {
      isAvailable: true
      source: "footprinter-string"
      footprinterString: string
    }
  | {
      isAvailable: false
      /** Closest footprinter match, usable as a `cadModel` string */
      closestFootprinter?: FootprinterDiscoveryCandidate
    }

export const getImported3dModelInfo = ({
  cadComponent,
  footprintConversion,
}: {
  cadComponent?: ImportedCadComponent
  footprintConversion: Pick<ImportedFootprintConversion, "candidate"> & {
    mode: ImportedFootprintConversion["mode"] | "exact-requested"
  }
}): Imported3dModelInfo => {
  if (cadComponent?.model_obj_url || cadComponent?.model_step_url) {
    return { isAvailable: true, source: "cad-model" }
  }

  const { candidate, mode } = footprintConversion

  // Every footprinter string has a generated 3D model
  if (mode === "footprinter" && candidate) {
    return {
      isAvailable: true,
      source: "footprinter-string",
      footprinterString: candidate.footprinterString,
    }
  }

  return { isAvailable: false, closestFootprinter: candidate }
}
