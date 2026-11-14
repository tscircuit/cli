import type { AnyCircuitElement } from "circuit-json"
import {
  circuitJsonToFootprinter,
  type FootprinterDiscoveryCandidate,
} from "lib/shared/circuit-json-to-footprinter"
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
  circuitJson,
  footprintConversion,
  sourceHints,
}: {
  cadComponent?: ImportedCadComponent
  circuitJson: readonly AnyCircuitElement[]
  footprintConversion: ImportedFootprintConversion | { mode: "exact-requested" }
  sourceHints?: string[]
}): Imported3dModelInfo => {
  if (cadComponent?.model_obj_url || cadComponent?.model_step_url) {
    return { isAvailable: true, source: "cad-model" }
  }

  // Every footprinter string has a generated 3D model
  if (
    footprintConversion.mode === "footprinter" &&
    footprintConversion.candidate
  ) {
    return {
      isAvailable: true,
      source: "footprinter-string",
      footprinterString: footprintConversion.candidate.footprinterString,
    }
  }

  if (footprintConversion.mode !== "exact-requested") {
    return {
      isAvailable: false,
      closestFootprinter: footprintConversion.candidate,
    }
  }

  try {
    return {
      isAvailable: false,
      closestFootprinter:
        circuitJsonToFootprinter(circuitJson, {
          maxCandidates: 5,
          sourceHints,
        }).best ?? undefined,
    }
  } catch {
    return { isAvailable: false }
  }
}
