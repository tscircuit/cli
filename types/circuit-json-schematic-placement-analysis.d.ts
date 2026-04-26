declare module "@tscircuit/circuit-json-schematic-placement-analysis" {
  import type { CircuitJson } from "circuit-json"

  export type SchematicPlacementLineItem = unknown

  export class SchematicPlacementAnalysis {
    constructor(lineItems: SchematicPlacementLineItem[])
    getLineItems(): SchematicPlacementLineItem[]
    getString(): string
    toString(): string
  }

  export function analyzeSchematicPlacement(
    circuitJson: CircuitJson,
  ): SchematicPlacementAnalysis
}
