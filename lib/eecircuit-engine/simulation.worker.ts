import { parentPort, workerData } from "node:worker_threads"
import { runSimulationInWorker } from "./run-simulation-in-worker"
import type {
  SimulationWorkerInput,
  SimulationWorkerMessage,
} from "./simulation-types"

const port = parentPort
if (!port) throw new Error("Simulation must run in a worker thread")
const input: SimulationWorkerInput = workerData
const send = (message: SimulationWorkerMessage) => port.postMessage(message)

runSimulationInWorker(input.spiceString, {
  timeoutMs: input.timeoutMs,
  onInitialized: async (spiceString) => {
    send({ type: "ready", spiceString })
    // Start only after the parent has installed the solver deadline.
    await new Promise<void>((resolve) => port.once("message", () => resolve()))
  },
}).then(
  (output) => send({ type: "result", output }),
  (error: Error) => send({ type: "error", message: error.message }),
)
