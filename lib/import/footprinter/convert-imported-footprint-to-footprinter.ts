import { fp } from "@tscircuit/footprinter"
import type { AnyCircuitElement } from "circuit-json"
import {
  circuitJsonToFootprinter,
  type FootprinterDiscoveryCandidate,
} from "lib/shared/circuit-json-to-footprinter"
import { getFootprinterToTargetPinMap } from "./get-footprinter-to-target-pin-map"
import { replaceExactFootprint } from "./replace-exact-footprint"

export const DEFAULT_FOOTPRINTER_ACCURACY_THRESHOLD = 0.98

const COURTYARD_ELEMENT_TYPES = new Set([
  "pcb_courtyard_rect",
  "pcb_courtyard_circle",
  "pcb_courtyard_outline",
  "pcb_courtyard_pill",
  "pcb_courtyard_polygon",
])

const hasCourtyard = (circuitJson: readonly AnyCircuitElement[]): boolean =>
  circuitJson.some((element) => COURTYARD_ELEMENT_TYPES.has(element.type))

export interface ImportedFootprintConversion {
  accuracy?: number
  candidate?: FootprinterDiscoveryCandidate
  mode:
    | "exact-courtyard-loss"
    | "exact-discovery-failed"
    | "exact-low-accuracy"
    | "footprinter"
  tsx: string
}

export const convertImportedFootprintToFootprinter = ({
  circuitJson,
  sourceHints,
  tsx,
}: {
  circuitJson: readonly AnyCircuitElement[]
  sourceHints?: string[]
  tsx: string
}): ImportedFootprintConversion => {
  try {
    const discovery = circuitJsonToFootprinter(circuitJson, {
      maxCandidates: 5,
      sourceHints,
    })
    const candidate = discovery.best
    if (
      !candidate ||
      candidate.copperIntersectionOverUnion <=
        DEFAULT_FOOTPRINTER_ACCURACY_THRESHOLD
    ) {
      return {
        accuracy: candidate?.copperIntersectionOverUnion,
        candidate: candidate ?? undefined,
        mode: "exact-low-accuracy",
        tsx,
      }
    }

    const footprinterCircuitJson = fp
      .string(candidate.footprinterString)
      .circuitJson() as AnyCircuitElement[]
    if (hasCourtyard(circuitJson) && !hasCourtyard(footprinterCircuitJson)) {
      return {
        accuracy: candidate.copperIntersectionOverUnion,
        candidate,
        mode: "exact-courtyard-loss",
        tsx,
      }
    }
    const pinMap = getFootprinterToTargetPinMap(
      circuitJson,
      footprinterCircuitJson,
    )
    if (!pinMap) {
      return {
        accuracy: candidate.copperIntersectionOverUnion,
        candidate,
        mode: "exact-discovery-failed",
        tsx,
      }
    }

    return {
      accuracy: candidate.copperIntersectionOverUnion,
      candidate,
      mode: "footprinter",
      tsx: replaceExactFootprint(tsx, candidate.footprinterString, pinMap),
    }
  } catch {
    return {
      mode: "exact-discovery-failed",
      tsx,
    }
  }
}
