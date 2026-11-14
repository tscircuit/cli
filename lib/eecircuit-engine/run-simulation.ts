import { runSimulationWorker } from "./run-simulation-worker"

export { SIMULATION_ENGINE, type SimulationOutput } from "./simulation-types"

export const runSimulation = (
  spiceString: string,
  options: { timeoutMs?: number; initializationTimeoutMs?: number } = {},
) => runSimulationWorker(spiceString, options)
