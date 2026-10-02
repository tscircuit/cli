import { fp } from "@tscircuit/footprinter"
import type { AnyCircuitElement } from "circuit-json"
import {
  circuitJsonToFootprinter,
  type FootprinterDiscoveryCandidate,
} from "lib/shared/circuit-json-to-footprinter"
import { getFootprinterToTargetPinMap } from "./get-footprinter-to-target-pin-map"
import { replaceExactFootprint } from "./replace-exact-footprint"

export const DEFAULT_FOOTPRINTER_ACCURACY_THRESHOLD = 0.98

export interface ImportedFootprintConversion {
  accuracy?: number
  candidate?: FootprinterDiscoveryCandidate
  mode:
    | "exact-discovery-failed"
    | "exact-low-accuracy"
    | "exact-pin-conflict"
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

    const targetHints = new Set(pinMap.values())
    if (
      [...pinMap].some(
        ([footprinterHint, targetHint]) =>
          footprinterHint !== targetHint && targetHints.has(footprinterHint),
      )
    ) {
      // Core matches attributes against every alias, including physical pin names.
      // Reusing another target pin's name would merge attributes between pins.
      return {
        accuracy: candidate.copperIntersectionOverUnion,
        candidate,
        mode: "exact-pin-conflict",
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
