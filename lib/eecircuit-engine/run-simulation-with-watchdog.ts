import type { Simulation } from "lib/types/eecircuit-engine"
import { isFatalSimulationDiagnostic } from "./is-fatal-simulation-diagnostic"

export function createSimulationTimeoutError(timeoutMs = 900000): Error {
  const duration =
    timeoutMs % 60000 === 0 ? `${timeoutMs / 60000} minutes` : `${timeoutMs} ms`
  return new Error(`Simulation timed out after ${duration}`)
}

export async function runSimulationWithWatchdog(
  simulation: Pick<Simulation, "runSim" | "getError">,
  { timeoutMs = 900000, pollMs = 100 } = {},
) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let monitor: ReturnType<typeof setInterval> | undefined
  try {
    return await Promise.race([
      simulation.runSim(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(createSimulationTimeoutError(timeoutMs))
        }, timeoutMs)
        monitor = setInterval(() => {
          const fatalErrors = simulation
            .getError()
            .filter(isFatalSimulationDiagnostic)
          if (fatalErrors.length) reject(new Error(fatalErrors.join("\n")))
        }, pollMs)
      }),
    ])
  } finally {
    clearTimeout(timeout)
    clearInterval(monitor)
  }
}
