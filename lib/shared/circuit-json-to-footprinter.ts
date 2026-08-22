import type { AnyCircuitElement } from "circuit-json"
import {
  type CircuitJsonToFootprinterOptions,
  type FootprinterDiscoveryResult,
  circuitJsonToFootprinter as circuitJsonToFootprinterWithBundledTypes,
} from "circuit-json-to-footprinter"

export type { FootprinterDiscoveryCandidate } from "circuit-json-to-footprinter"

type CircuitJsonToFootprinter = (
  circuitJson: readonly AnyCircuitElement[],
  options?: CircuitJsonToFootprinterOptions,
) => FootprinterDiscoveryResult

// circuit-json-to-footprinter bundles its own circuit-json version, which can
// differ from the CLI peer version. Keep that type drift isolated here.
export const circuitJsonToFootprinter =
  circuitJsonToFootprinterWithBundledTypes as CircuitJsonToFootprinter
