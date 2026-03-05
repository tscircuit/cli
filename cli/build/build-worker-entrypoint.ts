import { parentPort } from "node:worker_threads"
import { handleBuildFile } from "./worker-build-handlers"
import type {
  BuildCompletedMessage,
  WorkerInputMessage,
  WorkerLogMessage,
} from "./worker-types"

if (!parentPort) {
  throw new Error("This file must be run as a worker thread")
}

const sendMessage = (message: BuildCompletedMessage | WorkerLogMessage) => {
  parentPort!.postMessage(message)
}

const workerLog = (...args: unknown[]) => {
  const line = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
    .join(" ")

  sendMessage({
    message_type: "worker_log",
    log_lines: [line],
  })
}

parentPort.on("message", async (msg: WorkerInputMessage) => {
  if (msg.message_type === "build_file") {
    const result = await handleBuildFile(
      msg.file_path,
      msg.output_path,
      msg.glb_output_path,
      msg.preview_output_dir,
      msg.project_dir,
      msg.options,
      workerLog,
    )
    sendMessage(result)
  }
})
