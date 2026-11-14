import { parentPort, workerData } from "node:worker_threads"
import { writeFileSync } from "node:fs"
import {
  SIMULATION_ENGINE,
  type SimulationWorkerInput,
  type SimulationWorkerMessage,
} from "lib/eecircuit-engine/simulation-types"

const port = parentPort
if (!port) throw new Error("Recovery fixture requires a worker")
const input: SimulationWorkerInput = workerData
const job: { mode: "timeout" | "success"; lateWritePath: string } = JSON.parse(
  input.spiceString,
)
const send = (message: SimulationWorkerMessage) => port.postMessage(message)

send({ type: "ready", spiceString: input.spiceString })
port.once("message", () => {
  setTimeout(
    () => {
      if (job.mode === "timeout") {
        writeFileSync(
          job.lateWritePath,
          "late result from the timed-out solver",
        )
      }
      send({
        type: "result",
        output: {
          result: {
            header: "recovery fixture",
            dataType: "real",
            numPoints: 1,
            numVariables: 1,
            variableNames: ["v(out)"],
            data: [{ name: "v(out)", type: "voltage", values: [2.5] }],
          },
          info: job.mode,
          errors: [],
          engine: SIMULATION_ENGINE,
          spiceString: input.spiceString,
        },
      })
    },
    job.mode === "timeout" ? 50 : 150,
  )
})
