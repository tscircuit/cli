import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { ThreadWorkerPool } from "lib/shared/thread-worker-pool"

type TestJob = {
  id: string
  outcome: "hang" | "fatal" | "success" | "error" | "exit" | "clean_exit"
}
type TestMessage =
  | { type: "progress"; id: string }
  | { type: "complete"; id: string; fatal: boolean }

export const getThreadWorkerPoolTestFixture = (concurrency = 1) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "worker-pool-"))
  const workerPath = path.join(directory, "worker.cjs")
  fs.writeFileSync(
    workerPath,
    `const { parentPort } = require("node:worker_threads")
parentPort.on("message", (job) => {
  parentPort.postMessage({ type: "progress", id: job.id })
  if (job.outcome === "error") throw new Error("Worker routing failed")
  if (job.outcome === "exit") return process.exit(1)
  if (job.outcome === "clean_exit") return process.exit(0)
  if (job.outcome === "hang") {
    setInterval(() => {
      parentPort.postMessage({ type: "progress", id: job.id })
    }, 1000)
    return
  }
  parentPort.postMessage({
    type: "complete",
    id: job.id,
    fatal: job.outcome === "fatal",
  })
})`,
  )

  let resolveStarted: () => void = () => {}
  const started = new Promise<void>((resolve) => {
    resolveStarted = resolve
  })
  const logs: string[] = []
  const cancellationError = new Error("Cancelled after fatal result")
  const pool = new ThreadWorkerPool<TestJob, TestJob, TestMessage, string>({
    concurrency,
    workerEntrypointPath: workerPath,
    createMessage: (job) => job,
    isLogMessage: (message) => message.type === "progress",
    getLogLines: (message) => [message.id],
    isCompletionMessage: (message) => message.type === "complete",
    getResult: (message) => message.id,
    shouldStopOnMessage: (message) =>
      message.type === "complete" && message.fatal,
    cancellationError,
    jobTimeoutMs: 0,
    heartbeatIntervalMs: 0,
    onLog: (lines) => {
      logs.push(...lines)
      resolveStarted()
    },
  })

  return {
    pool,
    started,
    logs,
    cancellationError,
    cleanup: async () => {
      await pool.terminate()
      fs.rmSync(directory, { recursive: true, force: true })
    },
  }
}
