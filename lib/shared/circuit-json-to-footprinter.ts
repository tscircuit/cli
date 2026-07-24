import type { AnyCircuitElement } from "circuit-json"
import {
  circuitJsonToFootprinter as circuitJsonToFootprinterWithBundledTypes,
  type CircuitJsonToFootprinterOptions,
  type FootprinterDiscoveryResult,
} from "circuit-json-to-footprinter"

export type { FootprinterDiscoveryCandidate } from "circuit-json-to-footprinter"

type CircuitJsonToFootprinter = (
  circuitJson: readonly AnyCircuitElement[],
  options?: CircuitJsonToFootprinterOptions,
) => FootprinterDiscoveryResult

// circuit-json-to-footprinter@0.0.15 bundles an older circuit-json type.
// Keep that compatibility detail isolated at this dependency boundary.
export const circuitJsonToFootprinter =
  circuitJsonToFootprinterWithBundledTypes as CircuitJsonToFootprinter
