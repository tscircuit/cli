import fs from "node:fs"
import path from "node:path"

export type SolverDiagnosticsOptions = {
  enabled?: boolean
  outputPath: string
  entrypoint: string
  log?: (message: string) => void
}

type SolverStartedEventPayload = {
  solverName?: unknown
  componentName?: unknown
  solverParams?: unknown
  solverConstructorArgs?: unknown
}

const escapeJsonPointerSegment = (segment: string) =>
  segment.replaceAll("~", "~0").replaceAll("/", "~1")

const cloneAsJson = (
  value: unknown,
  ancestors = new WeakMap<object, string>(),
  path = "#",
): unknown => {
  if (value === undefined) return { value_type: "undefined" }
  if (typeof value === "bigint") {
    return { value_type: "bigint", value: value.toString() }
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return { value_type: "number", value: value.toString() }
  }
  if (typeof value === "number" && Object.is(value, -0)) {
    return { value_type: "number", value: "-0" }
  }
  if (typeof value === "symbol") {
    return { value_type: "symbol", value: value.description ?? null }
  }
  if (typeof value === "function") {
    return {
      value_type: "function",
      name: value.name || null,
      source: value.toString(),
    }
  }
  if (value === null || typeof value !== "object") return value

  const ancestorPath = ancestors.get(value)
  if (ancestorPath) {
    return { value_type: "circular_reference", path: ancestorPath }
  }
  ancestors.set(value, path)

  try {
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        cloneAsJson(item, ancestors, `${path}/${index}`),
      )
    }
    if (value instanceof Date) {
      return { value_type: "date", value: value.toISOString() }
    }
    if (value instanceof RegExp) {
      return {
        value_type: "regexp",
        source: value.source,
        flags: value.flags,
      }
    }
    if (value instanceof Map) {
      return {
        value_type: "map",
        entries: Array.from(value.entries(), ([key, item], index) => [
          cloneAsJson(key, ancestors, `${path}/entries/${index}/0`),
          cloneAsJson(item, ancestors, `${path}/entries/${index}/1`),
        ]),
      }
    }
    if (value instanceof Set) {
      return {
        value_type: "set",
        values: Array.from(value.values(), (item, index) =>
          cloneAsJson(item, ancestors, `${path}/values/${index}`),
        ),
      }
    }
    if (value instanceof Error) {
      return {
        value_type: "error",
        name: value.name,
        message: value.message,
        stack: value.stack,
      }
    }

    const clonedObject: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      clonedObject[key] = cloneAsJson(
        item,
        ancestors,
        `${path}/${escapeJsonPointerSegment(key)}`,
      )
    }
    return clonedObject
  } finally {
    ancestors.delete(value)
  }
}

export class SolverDiagnostics {
  private readonly options: SolverDiagnosticsOptions
  private readonly solverInvocations: Array<{
    sequence: number
    solver_name: string
    component_name: string | null
    constructor_args: unknown
  }> = []

  constructor(options: SolverDiagnosticsOptions) {
    this.options = options
  }

  attachToRootCircuit(rootCircuit: {
    on?: (eventName: string, listener: (event: unknown) => void) => void
  }) {
    if (!this.options.enabled) return

    rootCircuit.on?.("solver:started", (rawEvent) => {
      const event = rawEvent as SolverStartedEventPayload
      const constructorArgs = Array.isArray(event.solverConstructorArgs)
        ? event.solverConstructorArgs
        : [event.solverParams]

      this.solverInvocations.push({
        sequence: this.solverInvocations.length,
        solver_name:
          typeof event.solverName === "string"
            ? event.solverName
            : "unknown_solver",
        component_name:
          typeof event.componentName === "string" ? event.componentName : null,
        constructor_args: cloneAsJson(constructorArgs),
      })
    })
  }

  finalize() {
    if (!this.options.enabled) return

    fs.mkdirSync(path.dirname(this.options.outputPath), { recursive: true })
    fs.writeFileSync(
      this.options.outputPath,
      `${JSON.stringify(
        {
          format: "tscircuit_solver_debug_v1",
          entrypoint: this.options.entrypoint,
          solvers: this.solverInvocations,
        },
        null,
        2,
      )}\n`,
    )
    this.options.log?.(`Solver inputs written to ${this.options.outputPath}`)
  }
}
