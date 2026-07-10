import fs from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import kleur from "kleur"
import { convertSvgToPngBuffer } from "./convert-svg-to-png"

export type AutorouterDumpSrjMode = "all" | "failed" | `phase:${number}`

export type AutorouterDiagnosticsOptions = {
  enabled?: boolean
  timeoutMs?: number
  debugDir?: string
  dumpSrj?: AutorouterDumpSrjMode
  logOnError?: boolean
  longRunningLogThresholdMs?: number
  log?: (message: string) => void
}

type SimpleRouteJson = {
  connections?: Array<Record<string, unknown>>
  obstacles?: unknown[]
  traces?: unknown[]
  jumpers?: unknown[]
  [key: string]: unknown
}

type AutoroutingEventPayload = {
  subcircuit_id?: string
  subcircuitId?: string
  componentDisplayName?: string
  routingPhaseIndex?: number | null
  phaseOrdinal?: number
  phaseCount?: number
  connectionCount?: number
  obstacleCount?: number
  previousTraceCount?: number
  isReroutePhase?: boolean
  autorouterName?: string
  autorouterVersion?: string
  effort?: number
  solverName?: string
  iteration?: number
  steps?: number
  progress?: number
  phase?: string
  iterationsPerSecond?: number
  elapsedMs?: number
  simpleRouteJson?: SimpleRouteJson
  error?: { message?: string; stack?: string } | Error | string
}

type ActivePhase = {
  subcircuitId: string
  componentDisplayName: string
  routingPhaseIndex: number
  phaseOrdinal: number
  phaseCount?: number
  connectionCount: number
  obstacleCount: number
  previousTraceCount: number
  startedAt: number
  startedAtIso: string
  simpleRouteJson?: SimpleRouteJson
  routerDescription: string
  lastProgressLogAt: number
  hasLoggedStart: boolean
  longRunningLoggingStarted: boolean
  lastProgress?: AutoroutingEventPayload
}

const DEFAULT_DEBUG_DIR = path.join("dist", "autorouter-debug")
const PROGRESS_LOG_INTERVAL_MS = 10_000
const CIRCUIT_JSON_ID_PATTERN =
  /\b(?:source|pcb|schematic|subcircuit|cad|simulation)_[a-z0-9_]*_\d+\b/gi

export const parseAutorouterTimeout = (duration: string): number => {
  const trimmed = duration.trim()
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/)
  if (!match) {
    throw new Error(
      `Invalid --autorouter-timeout value "${duration}". Use values like "120s", "2m", or "5000ms".`,
    )
  }

  const value = Number.parseFloat(match[1])
  const unit = match[2] ?? "ms"
  const multiplier = unit === "m" ? 60_000 : unit === "s" ? 1_000 : 1
  const timeoutMs = Math.round(value * multiplier)
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("--autorouter-timeout must be greater than zero")
  }
  return timeoutMs
}

export const parseAutorouterDumpSrjMode = (
  value: string | boolean | undefined,
): AutorouterDumpSrjMode | undefined => {
  if (value === undefined || value === false) return undefined
  if (value === true || value === "") return "failed"
  if (value === "all" || value === "failed") return value
  const phaseMatch = value.match(/^phase:(\d+)$/)
  if (phaseMatch) return `phase:${Number.parseInt(phaseMatch[1], 10)}`
  throw new Error(
    `Invalid --autorouter-dump-srj value "${value}". Use "all", "failed", or "phase:<index>".`,
  )
}

export class AutorouterPhaseTimeoutError extends Error {
  debugArtifactPath?: string

  constructor(message: string, debugArtifactPath?: string) {
    super(message)
    this.name = "AutorouterPhaseTimeoutError"
    this.debugArtifactPath = debugArtifactPath
  }
}

export class AutorouterDiagnostics {
  private options: Required<Pick<AutorouterDiagnosticsOptions, "log">> &
    Omit<AutorouterDiagnosticsOptions, "log">
  private phaseOrdinalBySubcircuit = new Map<string, number>()
  private traceCountBySubcircuit = new Map<string, number>()
  private activePhase: ActivePhase | null = null
  private completedPhaseTraces: unknown[] = []
  private hasWrittenPlacementSnapshot = false
  private summary: Array<Record<string, unknown>> = []
  private rootCircuit: any

  constructor(options: AutorouterDiagnosticsOptions = {}) {
    this.options = {
      ...options,
      debugDir: options.debugDir ?? DEFAULT_DEBUG_DIR,
      log: options.log ?? console.log,
    }
  }

  get isActive() {
    return Boolean(
      this.options.enabled ||
        this.options.timeoutMs ||
        this.options.dumpSrj ||
        this.options.logOnError ||
        this.options.longRunningLogThresholdMs,
    )
  }

  attachToRootCircuit(rootCircuit: any) {
    if (!this.isActive) return
    this.rootCircuit = rootCircuit

    rootCircuit.on?.("autorouting:start", (event: AutoroutingEventPayload) =>
      this.handleStart(event),
    )
    rootCircuit.on?.("autorouting:progress", (event: AutoroutingEventPayload) =>
      this.handleProgress(event),
    )
    rootCircuit.on?.("autorouting:end", (event: AutoroutingEventPayload) =>
      this.handleEnd(event),
    )
    rootCircuit.on?.("autorouting:error", (event: AutoroutingEventPayload) =>
      this.handleError(event),
    )
  }

  checkTimeout() {
    this.checkLongRunning()

    if (!this.options.timeoutMs || !this.activePhase) return

    const elapsedMs = performance.now() - this.activePhase.startedAt
    if (elapsedMs < this.options.timeoutMs) return

    const artifactPath = this.writeTimeoutArtifact(this.activePhase, elapsedMs)
    const phaseLabel = this.getPhaseLabel(this.activePhase)
    const message = `Autorouter timeout after ${this.formatElapsed(elapsedMs)} in ${phaseLabel}.`
    this.log(kleur.red(message))

    throw new AutorouterPhaseTimeoutError(message, artifactPath)
  }

  finalize(circuitJson?: unknown[]) {
    if (
      !this.isActive ||
      this.summary.length === 0 ||
      (!this.options.enabled && !this.options.dumpSrj)
    ) {
      return
    }
    this.writeJson("board.meta.json", {
      type: "autorouter_debug_summary",
      generatedAt: new Date().toISOString(),
      phaseCount: this.summary.length,
      phases: this.summary,
      circuitJsonElementCount: circuitJson?.length,
    })
  }

  private handleStart(event: AutoroutingEventPayload) {
    const simpleRouteJson = event.simpleRouteJson
    const subcircuitId =
      event.subcircuit_id ?? event.subcircuitId ?? "unknown-subcircuit"
    const previousOrdinal = this.phaseOrdinalBySubcircuit.get(subcircuitId) ?? 0
    const phaseOrdinal = event.phaseOrdinal ?? previousOrdinal + 1
    this.phaseOrdinalBySubcircuit.set(subcircuitId, phaseOrdinal)
    const routingPhaseIndex = event.routingPhaseIndex ?? phaseOrdinal - 1
    const connectionCount =
      event.connectionCount ?? simpleRouteJson?.connections?.length ?? 0
    const obstacleCount =
      event.obstacleCount ?? simpleRouteJson?.obstacles?.length ?? 0
    const previousTraceCount =
      event.previousTraceCount ??
      this.traceCountBySubcircuit.get(subcircuitId) ??
      0

    this.activePhase = {
      subcircuitId,
      componentDisplayName: event.componentDisplayName ?? "subcircuit",
      routingPhaseIndex,
      phaseOrdinal,
      phaseCount: event.phaseCount,
      connectionCount,
      obstacleCount,
      previousTraceCount,
      startedAt: performance.now(),
      startedAtIso: new Date().toISOString(),
      simpleRouteJson,
      routerDescription: this.formatRouter(event),
      lastProgressLogAt: 0,
      hasLoggedStart: false,
      longRunningLoggingStarted: false,
    }

    if (this.options.enabled && !this.hasWrittenPlacementSnapshot) {
      const placementCircuitJson = this.getCurrentCircuitJson().filter(
        (element) => !this.isRouteElement(element),
      ) as AnyCircuitElement[]
      this.writePngSnapshot("placement-unrouted.png", placementCircuitJson)
      this.hasWrittenPlacementSnapshot = true
    }

    if (this.options.enabled) {
      this.logPhaseStart(this.activePhase)
    }

    if (this.shouldDumpInput(routingPhaseIndex)) {
      this.writeJson(
        this.getPhaseFileName(this.activePhase, "input.simple-route.json"),
        simpleRouteJson ?? {},
      )
    }
  }

  private handleProgress(event: AutoroutingEventPayload) {
    if (!this.activePhase) return
    const now = performance.now()
    this.activePhase.lastProgress = event
    if (!this.shouldLogPhaseDetails(this.activePhase)) return

    if (
      this.activePhase.lastProgressLogAt > 0 &&
      now - this.activePhase.lastProgressLogAt < PROGRESS_LOG_INTERVAL_MS
    ) {
      return
    }
    this.activePhase.lastProgressLogAt = now

    this.logProgress(this.activePhase, event, now)
  }

  private handleEnd(event: AutoroutingEventPayload) {
    const activePhase = this.matchActivePhase(event)
    if (!activePhase) return

    const elapsedMs = performance.now() - activePhase.startedAt
    const outputSrj = event.simpleRouteJson
    const outputTraceCount = outputSrj?.traces?.length ?? 0
    const outputJumperCount = outputSrj?.jumpers?.length ?? 0
    const errorCount = this.countErrors(outputSrj)
    const cumulativeTraceCount =
      activePhase.previousTraceCount + outputTraceCount

    this.traceCountBySubcircuit.set(
      activePhase.subcircuitId,
      cumulativeTraceCount,
    )
    this.completedPhaseTraces.push(...(outputSrj?.traces ?? []))
    this.summary.push({
      subcircuit_id: activePhase.subcircuitId,
      componentDisplayName: activePhase.componentDisplayName,
      routingPhaseIndex: activePhase.routingPhaseIndex,
      phaseOrdinal: activePhase.phaseOrdinal,
      phaseCount: activePhase.phaseCount,
      connectionCount: activePhase.connectionCount,
      obstacleCount: activePhase.obstacleCount,
      previousTraceCount: activePhase.previousTraceCount,
      outputTraceCount,
      outputJumperCount,
      errorCount,
      elapsedMs: Math.round(elapsedMs),
      startedAt: activePhase.startedAtIso,
      completedAt: new Date().toISOString(),
    })

    if (
      this.shouldLogPhaseDetails(activePhase) ||
      this.didCrossLongRunningThreshold(activePhase, elapsedMs)
    ) {
      if (!activePhase.hasLoggedStart) {
        this.startLongRunningLogging(activePhase, elapsedMs)
      }
      this.logPhaseEnd(activePhase, {
        outputTraceCount,
        outputJumperCount,
        errorCount,
        elapsedMs,
      })
    }

    if (this.shouldDumpSuccessfulOutput(activePhase.routingPhaseIndex)) {
      this.writeJson(
        this.getPhaseFileName(activePhase, "output.traces.json"),
        outputSrj?.traces ?? [],
      )
    }

    if (this.options.enabled) {
      this.writePngSnapshot(
        `phase-${activePhase.routingPhaseIndex}-routed.png`,
        this.getCircuitJsonWithCompletedPhaseTraces(),
      )
    }

    if (this.activePhase === activePhase) {
      this.activePhase = null
    }
  }

  private handleError(event: AutoroutingEventPayload) {
    const activePhase = this.matchActivePhase(event)
    if (!activePhase) return

    const elapsedMs = performance.now() - activePhase.startedAt
    const error = this.serializeError(event.error)
    this.summary.push({
      subcircuit_id: activePhase.subcircuitId,
      componentDisplayName: activePhase.componentDisplayName,
      routingPhaseIndex: activePhase.routingPhaseIndex,
      phaseOrdinal: activePhase.phaseOrdinal,
      phaseCount: activePhase.phaseCount,
      connectionCount: activePhase.connectionCount,
      obstacleCount: activePhase.obstacleCount,
      previousTraceCount: activePhase.previousTraceCount,
      elapsedMs: Math.round(elapsedMs),
      error,
      startedAt: activePhase.startedAtIso,
      completedAt: new Date().toISOString(),
    })

    if (this.options.enabled || this.options.logOnError) {
      if (!activePhase.hasLoggedStart) {
        this.logPhaseStart(activePhase, "failed")
      }
      this.log(
        `  ${this.getPhaseLabel(activePhase)} error after ${this.formatElapsed(elapsedMs)}: ${this.formatUserFacingText(error.message)}`,
      )
    }

    if (this.shouldDumpFailedInput(activePhase.routingPhaseIndex)) {
      this.writeJson(
        this.getPhaseFileName(activePhase, "input.simple-route.json"),
        event.simpleRouteJson ?? activePhase.simpleRouteJson ?? {},
      )
      this.writeJson(this.getPhaseFileName(activePhase, "error.json"), {
        type: "autorouter_phase_error",
        subcircuit_id: activePhase.subcircuitId,
        routingPhaseIndex: activePhase.routingPhaseIndex,
        phaseOrdinal: activePhase.phaseOrdinal,
        phaseCount: activePhase.phaseCount,
        elapsedMs: Math.round(elapsedMs),
        connectionCount: activePhase.connectionCount,
        obstacleCount: activePhase.obstacleCount,
        previousTraceCount: activePhase.previousTraceCount,
        error,
      })
    }

    if (this.activePhase === activePhase) {
      this.activePhase = null
    }
  }

  private writeTimeoutArtifact(activePhase: ActivePhase, elapsedMs: number) {
    const inputFile = this.getPhaseFileName(
      activePhase,
      "input.simple-route.json",
    )
    const previousTracesFile = this.getPhaseFileName(
      activePhase,
      "previous-output.traces.json",
    )
    const timeoutFile = this.getPhaseFileName(activePhase, "timeout.json")
    const boardFile = "board.source-and-pcb.circuit.json"

    this.writeJson(inputFile, activePhase.simpleRouteJson ?? {})
    this.writeJson(previousTracesFile, this.completedPhaseTraces)
    this.writeJson(boardFile, this.getCurrentCircuitJson())

    return this.writeJson(timeoutFile, {
      type: "autorouter_phase_timeout",
      subcircuit_id: activePhase.subcircuitId,
      componentDisplayName: activePhase.componentDisplayName,
      routingPhaseIndex: activePhase.routingPhaseIndex,
      phaseOrdinal: activePhase.phaseOrdinal,
      phaseCount: activePhase.phaseCount,
      elapsedMs: Math.round(elapsedMs),
      connectionCount: activePhase.connectionCount,
      obstacleCount: activePhase.obstacleCount,
      previousTraceCount: activePhase.previousTraceCount,
      autorouter: {
        kind: "default-or-core",
      },
      files: {
        inputSimpleRouteJson: inputFile,
        previousOutputTraces: previousTracesFile,
        boardCircuitJson: boardFile,
      },
      lastProgress: activePhase.lastProgress,
    })
  }

  private checkLongRunning() {
    if (!this.activePhase) return
    const elapsedMs = performance.now() - this.activePhase.startedAt
    if (!this.didCrossLongRunningThreshold(this.activePhase, elapsedMs)) return
    this.startLongRunningLogging(this.activePhase, elapsedMs)
  }

  private didCrossLongRunningThreshold(
    activePhase: ActivePhase,
    elapsedMs: number,
  ) {
    return Boolean(
      !this.options.enabled &&
        this.options.longRunningLogThresholdMs &&
        !activePhase.longRunningLoggingStarted &&
        elapsedMs >= this.options.longRunningLogThresholdMs,
    )
  }

  private startLongRunningLogging(activePhase: ActivePhase, elapsedMs: number) {
    activePhase.longRunningLoggingStarted = true
    this.log(
      kleur.yellow(
        `Autorouting ${this.getPhaseLabel(activePhase)} has been running for ${this.formatElapsed(elapsedMs)}; enabling phase diagnostics. Re-run with --autorouter-debug for full autorouter logs from the start.`,
      ),
    )
    this.logPhaseStart(activePhase, "long-running")
    if (activePhase.lastProgress) {
      this.logProgress(activePhase, activePhase.lastProgress, performance.now())
    }
  }

  private shouldLogPhaseDetails(activePhase: ActivePhase) {
    return Boolean(
      this.options.enabled || activePhase.longRunningLoggingStarted,
    )
  }

  private logPhaseStart(activePhase: ActivePhase, reason?: string) {
    const reasonText = reason ? ` ${reason}` : ""
    this.log(
      [
        `Autorouting ${this.formatUserFacingText(activePhase.componentDisplayName)} ${this.getPhaseLabel(activePhase)}${reasonText} start:`,
        `connections=${activePhase.connectionCount},`,
        `obstacles=${activePhase.obstacleCount},`,
        `previous_traces=${activePhase.previousTraceCount}`,
        activePhase.routerDescription
          ? `, ${activePhase.routerDescription}`
          : "",
      ].join(" "),
    )

    const connectionNames = this.getConnectionNames(activePhase.simpleRouteJson)
    if (connectionNames.length > 0) {
      this.log(`  connections: ${connectionNames.join(", ")}`)
    }
    activePhase.hasLoggedStart = true
  }

  private logProgress(
    activePhase: ActivePhase,
    event: AutoroutingEventPayload,
    now: number,
  ) {
    const elapsedMs = event.elapsedMs ?? now - activePhase.startedAt
    const details = [
      event.solverName ? `solver=${event.solverName}` : null,
      event.phase ? `solver_phase=${event.phase}` : null,
      event.iteration !== undefined
        ? `iter=${event.iteration}`
        : event.steps !== undefined
          ? `steps=${event.steps}`
          : null,
      event.progress !== undefined
        ? `progress=${Math.round(event.progress * 100)}%`
        : null,
      event.iterationsPerSecond !== undefined
        ? `iterations_per_second=${Math.round(event.iterationsPerSecond)}`
        : null,
      `elapsed=${this.formatElapsed(elapsedMs)}`,
    ].filter(Boolean)

    this.log(
      `  ${this.getPhaseLabel(activePhase)} progress: ${details.join(" ")}`,
    )
  }

  private logPhaseEnd(
    activePhase: ActivePhase,
    {
      outputTraceCount,
      outputJumperCount,
      errorCount,
      elapsedMs,
    }: {
      outputTraceCount: number
      outputJumperCount: number
      errorCount: number
      elapsedMs: number
    },
  ) {
    this.log(
      `  ${this.getPhaseLabel(activePhase)} done: routed_traces=${outputTraceCount}, jumpers=${outputJumperCount}, errors=${errorCount}, elapsed=${this.formatElapsed(elapsedMs)}`,
    )
  }

  private matchActivePhase(event: AutoroutingEventPayload) {
    if (!this.activePhase) return null
    const subcircuitId = event.subcircuit_id ?? event.subcircuitId
    if (subcircuitId && subcircuitId !== this.activePhase.subcircuitId) {
      return null
    }
    return this.activePhase
  }

  private shouldDumpInput(routingPhaseIndex: number) {
    return (
      this.options.dumpSrj === "all" ||
      this.options.dumpSrj === `phase:${routingPhaseIndex}`
    )
  }

  private shouldDumpSuccessfulOutput(routingPhaseIndex: number) {
    return (
      this.options.dumpSrj === "all" ||
      this.options.dumpSrj === `phase:${routingPhaseIndex}`
    )
  }

  private shouldDumpFailedInput(routingPhaseIndex: number) {
    return (
      this.options.dumpSrj === "all" ||
      this.options.dumpSrj === "failed" ||
      this.options.dumpSrj === `phase:${routingPhaseIndex}`
    )
  }

  private writeJson(fileName: string, value: unknown) {
    const debugDir = path.resolve(this.options.debugDir ?? DEFAULT_DEBUG_DIR)
    fs.mkdirSync(debugDir, { recursive: true })
    const filePath = path.join(debugDir, fileName)
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
    this.logArtifact(filePath)
    return filePath
  }

  private writePngSnapshot(fileName: string, circuitJson: AnyCircuitElement[]) {
    const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson)
    const png = convertSvgToPngBuffer(pcbSvg)
    const debugDir = path.resolve(this.options.debugDir ?? DEFAULT_DEBUG_DIR)
    fs.mkdirSync(debugDir, { recursive: true })
    const filePath = path.join(debugDir, fileName)
    fs.writeFileSync(filePath, png)
    this.logArtifact(filePath)
  }

  private logArtifact(filePath: string) {
    this.log(`Wrote debug artifact: ${path.relative(process.cwd(), filePath)}`)
  }

  private getCircuitJsonWithCompletedPhaseTraces() {
    const circuitJson = [...this.getCurrentCircuitJson()]
    const elementIndexById = new Map<string, number>()

    for (const [index, element] of circuitJson.entries()) {
      const id = this.getCircuitElementId(element)
      if (id) elementIndexById.set(id, index)
    }

    for (const trace of this.completedPhaseTraces) {
      if (!trace || typeof trace !== "object") continue
      const element = trace as Record<string, unknown>
      const id = this.getCircuitElementId(element)
      const existingIndex = id ? elementIndexById.get(id) : undefined
      if (existingIndex === undefined) {
        circuitJson.push(element)
        if (id) elementIndexById.set(id, circuitJson.length - 1)
      } else {
        circuitJson[existingIndex] = element
      }
    }

    return circuitJson as AnyCircuitElement[]
  }

  private getCircuitElementId(element: Record<string, unknown>) {
    if (typeof element.type !== "string") return undefined
    const id = element[`${element.type}_id`]
    return typeof id === "string" ? id : undefined
  }

  private isRouteElement(element: Record<string, unknown>) {
    return element.type === "pcb_trace" || element.type === "pcb_via"
  }

  private getPhaseFileName(activePhase: ActivePhase, suffix: string) {
    const phaseNumber = activePhase.routingPhaseIndex
    return `phase-${phaseNumber}.${suffix}`
  }

  private getPhaseLabel(activePhase: ActivePhase) {
    if (activePhase.phaseCount) {
      return `phase ${activePhase.phaseOrdinal}/${activePhase.phaseCount}`
    }
    return `phase ${activePhase.phaseOrdinal}`
  }

  private formatElapsed(elapsedMs: number) {
    if (elapsedMs < 1_000) return `${Math.round(elapsedMs)}ms`
    return `${(elapsedMs / 1_000).toFixed(1)}s`
  }

  private formatRouter(event: AutoroutingEventPayload) {
    const parts = [
      event.autorouterName ? `router=${event.autorouterName}` : null,
      event.autorouterVersion ? `version=${event.autorouterVersion}` : null,
      event.effort !== undefined ? `effort=${event.effort}` : null,
    ].filter(Boolean)
    return parts.join(", ")
  }

  private getConnectionNames(simpleRouteJson?: SimpleRouteJson) {
    return [
      ...new Set(
        (simpleRouteJson?.connections ?? [])
          .map((connection) =>
            [
              connection.rootConnectionName,
              connection.name,
              connection.source_trace_id,
            ]
              .filter((value): value is string => typeof value === "string")
              .map((value) => this.resolveCircuitJsonId(value))
              .find((value) => value !== null),
          )
          .filter((name): name is string => name !== null),
      ),
    ]
  }

  private resolveCircuitJsonId(value: string): string | null {
    const circuitJson = this.getCurrentCircuitJson()
    const element = circuitJson.find((candidate) =>
      Object.entries(candidate).some(
        ([key, candidateValue]) =>
          key.endsWith("_id") && candidateValue === value,
      ),
    )

    if (!element) return value

    if (element.type === "source_trace") {
      if (typeof element.name === "string") return element.name
      return this.getTraceSelector(element, circuitJson)
    }

    if (element.type === "source_net" && typeof element.name === "string") {
      return `net.${element.name}`
    }

    if (element.type === "source_port") {
      return this.getPortSelector(element, circuitJson)
    }

    return null
  }

  private formatUserFacingText(value: string) {
    let formattedValue = value
    for (const element of this.getCurrentCircuitJson()) {
      for (const [key, id] of Object.entries(element)) {
        if (!key.endsWith("_id") || typeof id !== "string") continue
        formattedValue = formattedValue.replaceAll(
          id,
          this.resolveCircuitJsonId(id) ?? "internal element",
        )
      }
    }
    return formattedValue.replace(CIRCUIT_JSON_ID_PATTERN, "internal element")
  }

  private getTraceSelector(
    trace: Record<string, unknown>,
    circuitJson: Array<Record<string, unknown>>,
  ) {
    const portIds = trace.connected_source_port_ids
    if (!Array.isArray(portIds)) return null

    const selectors = portIds
      .map((portId) =>
        typeof portId === "string"
          ? this.getPortSelectorById(portId, circuitJson)
          : null,
      )
      .filter((selector): selector is string => selector !== null)

    return selectors.length >= 2 ? selectors.join(" to ") : null
  }

  private getPortSelectorById(
    sourcePortId: string,
    circuitJson: Array<Record<string, unknown>>,
  ) {
    const port = circuitJson.find(
      (element) =>
        element.type === "source_port" &&
        element.source_port_id === sourcePortId,
    )
    return port ? this.getPortSelector(port, circuitJson) : null
  }

  private getPortSelector(
    port: Record<string, unknown>,
    circuitJson: Array<Record<string, unknown>>,
  ) {
    const portName =
      typeof port.most_frequently_referenced_by_name === "string"
        ? port.most_frequently_referenced_by_name
        : typeof port.name === "string"
          ? port.name
          : null
    if (!portName) return null

    const component = circuitJson.find(
      (element) =>
        element.type === "source_component" &&
        element.source_component_id === port.source_component_id,
    )
    const componentName =
      component && typeof component.name === "string" ? component.name : null

    return componentName ? `${componentName}.${portName}` : portName
  }

  private countErrors(simpleRouteJson?: SimpleRouteJson) {
    const errors = simpleRouteJson?.errors
    return Array.isArray(errors) ? errors.length : 0
  }

  private getCurrentCircuitJson() {
    try {
      const circuitJson = this.rootCircuit?.db?.toArray?.()
      return Array.isArray(circuitJson)
        ? (circuitJson as Array<Record<string, unknown>>)
        : []
    } catch {
      return []
    }
  }

  private serializeError(error: AutoroutingEventPayload["error"]) {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack }
    }
    if (typeof error === "string") {
      return { message: error }
    }
    return {
      message: error?.message ?? "Unknown autorouting error",
      stack: error?.stack,
    }
  }

  private log(message: string) {
    this.options.log(message)
  }
}
