/**
 * Which connections were hardest to route in one autorouting stage, as
 * emitted by core on `autorouting:progress`, `:end` and `:error` events.
 * Older versions of core do not send it, so it is always optional.
 */
export type ComputeCostSummary = {
  readonly metric: "hypergraph_route_search_iterations"
  readonly measuredPairCount: number
  /** Most expensive first; at most 25. */
  readonly topPairs: readonly {
    readonly connectionName: string
    readonly rootConnectionNames: readonly string[]
    readonly pcbPortIds: readonly [string | null, string | null]
    /** Search iterations needed to route this pair alone. */
    readonly iterations: number
  }[]
}

/** The same summary with a readable label, like "R2.pin2", for each endpoint. */
export type LabeledComputeCostSummary = Omit<ComputeCostSummary, "topPairs"> & {
  topPairs: Array<ComputeCostSummary["topPairs"][number] & { labels: string[] }>
}

export const labelComputeCostSummary = (
  summary: ComputeCostSummary,
  getPcbPortLabel: (pcbPortId: string) => string | null,
): LabeledComputeCostSummary => ({
  ...summary,
  topPairs: summary.topPairs.map((pair) => ({
    ...pair,
    labels: pair.pcbPortIds.map((pcbPortId) => {
      // Synthetic endpoints (breakouts, escape vias) have no pcb port.
      if (pcbPortId === null) return pair.connectionName
      return getPcbPortLabel(pcbPortId) ?? pair.connectionName
    }),
  })),
})

/** e.g. "R2.pin2 -> U1.pin2 (71 iters), J1.pin2 -> R2.pin1 (8 iters)" */
export const formatHardestConnections = (
  summary: LabeledComputeCostSummary,
  count = 5,
) =>
  summary.topPairs
    .slice(0, count)
    .map((pair) => {
      const [from, to] = pair.labels
      // Two synthetic endpoints both fall back to the connection name.
      const endpoints = from === to ? from : `${from} -> ${to}`
      return `${endpoints} (${pair.iterations} iters)`
    })
    .join(", ")
