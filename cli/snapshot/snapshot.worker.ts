import { parentPort } from "node:worker_threads"
import { handleSnapshotFile } from "./worker-snapshot-handlers"
import type {
  SnapshotCompletedMessage,
  WorkerInputMessage,
  WorkerLogMessage,
} from "./worker-types"

if (!parentPort) {
  throw new Error("This file must be run as a worker thread")
}

const sendMessage = (message: SnapshotCompletedMessage | WorkerLogMessage) => {
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
  if (msg.message_type === "snapshot_file") {
    try {
      const result = await handleSnapshotFile(
        msg.file_path,
        msg.project_dir,
        msg.snapshots_dir_name,
        msg.options,
      )
      sendMessage(result)
    } catch (error) {
      workerLog(
        `Worker failed while snapshotting ${msg.file_path}:`,
        error instanceof Error ? error.message : String(error),
      )
      sendMessage({
        message_type: "snapshot_completed",
        file_path: msg.file_path,
        result: {
          ok: false,
          didUpdate: false,
          successPaths: [],
          warningMessages: [],
          mismatches: [],
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }
})
