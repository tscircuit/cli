type AutoroutingEvent = {
  subcircuit_id?: string
  subcircuitId?: string
  routingPhaseIndex?: number | null
  isReroutePhase?: boolean
  connectionCount?: number
  simpleRouteJson?: { connections?: unknown[] }
}

type RootCircuit = {
  on?: (event: string, listener: (event: AutoroutingEvent) => void) => void
}

/** Checked by the render loop so completed/failed phases cannot leave timers behind. */
export function attachRouteRemainingWarning(
  root: RootCircuit,
  log: (message: string) => void = console.warn,
  now: () => number = () => performance.now(),
) {
  const phases = new Map<
    string,
    { traceCount: number; startedAt: number; warned: boolean }
  >()
  const getKey = (event: AutoroutingEvent) =>
    event.subcircuit_id ?? event.subcircuitId ?? "unknown-subcircuit"

  root.on?.("autorouting:start", (event) => {
    const key = getKey(event)
    phases.delete(key)
    const traceCount =
      event.connectionCount ?? event.simpleRouteJson?.connections?.length ?? 0
    // Preserve null: numeric indices identify explicitly assigned phases.
    if (
      event.routingPhaseIndex !== null ||
      event.isReroutePhase ||
      traceCount <= 30
    ) {
      return
    }
    phases.set(key, { traceCount, startedAt: now(), warned: false })
  })
  const clearPhase = (event: AutoroutingEvent) => {
    phases.delete(getKey(event))
  }
  root.on?.("autorouting:end", clearPhase)
  root.on?.("autorouting:error", clearPhase)
  root.on?.("renderComplete", () => phases.clear())

  return () => {
    for (const phase of phases.values()) {
      if (phase.warned || now() - phase.startedAt < 20_000) continue
      phase.warned = true
      log(
        `Routing ${phase.traceCount} traces in a routeRemaining phase, try setting <board routeRemaining={false}> to incrementally route the board using <autoroutingphase /> directives`,
      )
    }
  }
}
