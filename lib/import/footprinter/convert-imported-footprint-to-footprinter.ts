import { fp } from "@tscircuit/footprinter"
import type { AnyCircuitElement } from "circuit-json"
import {
  circuitJsonToFootprinter,
  type FootprinterDiscoveryCandidate,
} from "circuit-json-to-footprinter"
import { getFootprinterToTargetPinMap } from "./get-footprinter-to-target-pin-map"
import { replaceExactFootprint } from "./replace-exact-footprint"

export const DEFAULT_FOOTPRINTER_ACCURACY_THRESHOLD = 0.98

export interface ImportedFootprintConversion {
  accuracy?: number
  candidate?: FootprinterDiscoveryCandidate
  mode: "exact-discovery-failed" | "exact-low-accuracy" | "footprinter"
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
