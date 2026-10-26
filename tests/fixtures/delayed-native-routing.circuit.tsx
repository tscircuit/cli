import { EventEmitter } from "node:events"
import { RootCircuit } from "tscircuit"
import { withAutorouterCache } from "@tscircuit/core"
import { AutoroutingPipelineSolver9_PreloadedTraceGraph } from "@tscircuit/capacity-autorouter"

export const stats = {
  componentCount: 2,
  delayMs: 500,
  waiting: false,
  rendersWhileWaiting: 0,
  totalRenders: 0,
  inputs: [] as unknown[],
}
export function installRenderCounter(): () => void {
  const original = RootCircuit.prototype.render
  RootCircuit.prototype.render = function (...args: []) {
    stats.totalRenders++
    if (stats.waiting) stats.rendersWhileWaiting++
    return original.apply(this, args)
  }
  return () => {
    RootCircuit.prototype.render = original
  }
}
class DelayedNativeAutorouter extends EventEmitter {
  isRouting = false
  private timer?: ReturnType<typeof setTimeout>
  constructor(public input: any) {
    super()
    stats.inputs.push(input)
  }
  solveSync(): any[] {
    const solver = new AutoroutingPipelineSolver9_PreloadedTraceGraph(
      this.input,
      { effort: 1 },
    )
    solver.solve()
    if (!solver.solved || solver.failed)
      throw Error(solver.error ?? "Native routing failed")
    return solver.getOutputSimpleRouteJson().traces!
  }
  start(): void {
    this.isRouting = true
    stats.waiting = true
    this.timer = setTimeout(() => {
      stats.waiting = false
      try {
        const traces = this.solveSync()
        this.emit("complete", { type: "complete", traces })
      } catch (error) {
        this.emit("error", { type: "error", error })
      } finally {
        this.isRouting = false
      }
    }, stats.delayMs)
  }
  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    stats.waiting = false
    this.isRouting = false
  }
}
let pendingRouter: DelayedNativeAutorouter | undefined
export function stopDelayedNativeRouting(): void {
  pendingRouter?.stop()
  pendingRouter = undefined
}
const factory = withAutorouterCache((input: any) => {
  pendingRouter = new DelayedNativeAutorouter(input)
  return pendingRouter
}, "cli-delayed-native-routing-repro")
export default function DelayedNativeRouting() {
  const columns = Math.min(32, stats.componentCount),
    rows = Math.ceil(stats.componentCount / columns)
  return (
    <board
      width={columns * 2 + 4}
      height={rows * 2 + 4}
      layers={4}
      minViaHoleDiameter={0.3}
      minViaPadDiameter={0.5}
      allowBlindAndBuriedVias={false}
      schAutoLayoutEnabled={false}
    >
      {Array.from({ length: stats.componentCount }, (_, i) => (
        <resistor
          key={i}
          name={`R${i + 1}`}
          resistance="1k"
          footprint="0402"
          pcbX={((i % columns) - (columns - 1) / 2) * 2}
          pcbY={(Math.floor(i / columns) - (rows - 1) / 2) * 2}
        />
      ))}
      <trace from=".R1 > .pin1" to=".R2 > .pin1" routingPhaseIndex={0} />
      <autoroutingphase
        name="DELAYED_NATIVE"
        phaseIndex={0}
        algorithmFn={factory}
      />
    </board>
  )
}
