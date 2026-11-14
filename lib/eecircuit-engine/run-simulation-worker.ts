import { existsSync } from "node:fs"
import path from "node:path"
import { Worker } from "node:worker_threads"
import { fileURLToPath } from "node:url"
import { createSimulationTimeoutError } from "./run-simulation-with-watchdog"
import {
  SIMULATION_ENGINE,
  type SimulationOutput,
  type SimulationWorkerMessage,
} from "./simulation-types"

function getWorkerEntrypointPath() {
  const directory = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(directory, "simulation.worker.ts"),
    path.join(directory, "simulation.worker.js"),
    path.join(directory, "eecircuit-engine/simulation.worker.js"),
    path.join(directory, "../lib/eecircuit-engine/simulation.worker.js"),
  ]
  const entrypoint = candidates.find(existsSync)
  if (!entrypoint) throw new Error("Simulation worker entrypoint not found")
  return entrypoint
}

export async function runSimulationWorker(
  spiceString: string,
  {
    timeoutMs = 900000,
    initializationTimeoutMs = 15000,
    workerEntrypointPath = getWorkerEntrypointPath(),
  } = {},
): Promise<SimulationOutput> {
  // Never reuse a solver: its run promise and WASM state can survive a timeout.
  const worker = new Worker(workerEntrypointPath, {
    workerData: { spiceString, timeoutMs },
  })
  let deadline: ReturnType<typeof setTimeout> | undefined
  let executedNetlist = spiceString
  let finished = false
  try {
    return await new Promise<SimulationOutput>((resolve, reject) => {
      deadline = setTimeout(
        () => reject(new Error("Simulation engine initialization timed out.")),
        initializationTimeoutMs,
      )
      worker.on("message", (message: SimulationWorkerMessage) => {
        if (finished) return
        if (message.type === "ready") {
          executedNetlist = message.spiceString
          clearTimeout(deadline)
          // This timer also works while synchronous WASM blocks the worker.
          deadline = setTimeout(
            () => reject(createSimulationTimeoutError(timeoutMs)),
            timeoutMs,
          )
          worker.postMessage({ type: "run" })
        } else if (message.type === "result") {
          resolve(message.output)
        } else {
          reject(new Error(message.message))
        }
      })
      worker.once("error", reject)
      worker.once("exit", (code) => {
        reject(
          new Error(`Simulation worker exited without a result (code ${code})`),
        )
      })
    })
  } catch (error) {
    return {
      result: null,
      info: "",
      errors: [
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      ],
      engine: SIMULATION_ENGINE,
      spiceString: executedNetlist,
    }
  } finally {
    finished = true
    clearTimeout(deadline)
    // Wait for termination before returning, including on success and aborts.
    // No late callbacks, diagnostics or native work may reach a later run.
    await worker.terminate()
  }
}
