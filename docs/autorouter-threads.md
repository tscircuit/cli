# Local autorouting threads

The CLI defaults to four local routing workers per active Pipeline9 autorouter
on Node and Bun 1.4.2 or newer. On older Bun releases, the CLI defaults to one
thread (inline routing). This setting is `autorouterThreads` in the platform
configuration; `threads` is not a supported platform-config field.

## Configure a project

Create `tscircuit.config.ts` in the project directory:

```ts
export default {
  platformConfig: {
    autorouterThreads: 4,
  },
}
```

Then run `tsci build index.circuit.tsx`. Set `autorouterThreads: 1` to use inline
routing, including when diagnosing a problem or running on an older Bun release.
The count must be a positive safe integer. The CLI merges this configuration
after its defaults, so an explicit project setting takes precedence. Use the
TypeScript or JavaScript config module for `platformConfig`; it is a runtime
configuration field, not a field in the JSON project-config schema.

Counts greater than one enable worker-backed `solveAsync` for the default local
Pipeline9 solver on Node and Bun. Bun requires version 1.4.2 or newer. The CLI
prefers Bun when it is installed. Its platform-config loader checks the running
Bun version and selects inline routing by default when workers are unsupported.
An explicit `autorouterThreads` override still takes precedence; requesting more
than one thread on older Bun requires upgrading Bun. Worker startup failures are
not retried inline. Browsers route inline.
Cloud routing, alternative pipelines, and custom `algorithmFn` routers retain
their own execution behavior. A board with routing disabled or no unrouted
connections may create no workers.

Use a cold routing cache when checking compatibility. A cache hit can skip worker
creation and hide an unsupported runtime. In an isolated test checkout, remove
`.tscircuit/cache` and previous `dist` outputs before comparing configurations.

`--concurrency` controls how many board files the CLI builds at once. It is
independent of `autorouterThreads`: four concurrent board builds can request four
separate pools of four routing workers, in addition to the build workers and main
process. Measure CPU and memory limits in CI before raising both settings.

## Create workers from library code

For a circuit, let core create and dispose the routing workers:

```tsx
import { RootCircuit } from "tscircuit"

const circuit = new RootCircuit({
  platform: { autorouterThreads: 4 },
})
circuit.add(
  <board width="20mm" height="20mm">
    <resistor name="R1" resistance="1k" footprint="0402" pcbX={-4} />
    <resistor name="R2" resistance="1k" footprint="0402" pcbX={4} />
    <trace from=".R1 > .pin1" to=".R2 > .pin1" />
  </board>,
)
await circuit.renderUntilSettled()
const circuitJson = circuit.getCircuitJson()
```

For a custom integration operating directly on a Pipeline9 solver, create a
runtime using the host-specific entrypoint. In Bun:

```ts
import { AutoroutingPipelineSolver9_PreloadedTraceGraph } from "@tscircuit/capacity-autorouter"
import { createAutorouterSolverRuntime } from "@tscircuit/capacity-autorouter/runtime/bun"

const runtime = createAutorouterSolverRuntime({
  workerCount: 4,
  requireWorker: true,
})
try {
  const solver = new AutoroutingPipelineSolver9_PreloadedTraceGraph(simpleRouteJson)
  await solver.solveAsync(runtime)
  if (!solver.solved) throw new Error(solver.error ?? "Autorouting failed")
  const result = solver.getOutputSimpleRouteJson()
  // Consume result before disposing or reuse the runtime for another solve.
} finally {
  await runtime.dispose()
}
```

`simpleRouteJson` is the application's routing input. For Node, change the
runtime import suffix from `/runtime/bun` to `/runtime/node`. The published
capacity-autorouter runtime supplies a bundled worker source; consumers do not
need to write a worker entrypoint or call `new Worker()` themselves. Pools create
workers when needed, so creating a runtime alone does not demonstrate that a
solve used workers. Always dispose the runtime after success or failure.

Core's synchronous `solveSync()` path remains inline. Worker-backed routing is
asynchronous, and worker cleanup completes before core emits completion or error.
Do not assume parallel routing produces byte-identical trace geometry or a
fourfold speedup: compare connectivity, routing diagnostics, wall time, and peak
memory on representative boards.

## Sources

- [Core thread configuration and lifecycle](https://github.com/tscircuit/core/blob/main/docs/autorouter-threads.md)
- [PlatformConfig definition](https://github.com/tscircuit/props/blob/main/lib/platformConfig.ts)
- [CLI platform defaults](https://github.com/tscircuit/cli/blob/main/lib/shared/get-platform-config-with-cli-defaults.ts)
