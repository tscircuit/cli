import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { ThreadWorkerPool } from "lib/shared/thread-worker-pool"
import { temporaryDirectory } from "tempy"

type TestJob = {
  id: string
  hang?: boolean
}

type TestWorkerMessage =
  | {
      message_type: "done"
      id: string
    }
  | {
      message_type: "log"
      log_lines: string[]
    }

const writeTestWorker = () => {
  const tempDir = temporaryDirectory()
  const workerPath = path.join(tempDir, "timeout-worker.js")

  fs.writeFileSync(
    workerPath,
    [
      'const { parentPort } = require("node:worker_threads")',
      "",
      "if (!parentPort) {",
      '  throw new Error("Worker must run in worker thread")',
      "}",
      "",
      'parentPort.on("message", (msg) => {',
      "  if (msg.hang) {",
      "    return",
      "  }",
      "",
      "  parentPort.postMessage({",
      '    message_type: "done",',
      "    id: msg.id,",
      "  })",
      "})",
    ].join("\n"),
    "utf-8",
  )

  return workerPath
}

test("thread worker pool times out stuck jobs and continues", async () => {
  const pool = new ThreadWorkerPool<
    TestJob,
    TestJob,
    TestWorkerMessage,
    string
  >({
    concurrency: 1,
    workerEntrypointPath: writeTestWorker(),
    createMessage: (job) => job,
    isLogMessage: (message) => message.message_type === "log",
    getLogLines: (message) =>
      message.message_type === "log" ? message.log_lines : [],
    isCompletionMessage: (message) => message.message_type === "done",
    getResult: (message) => {
      if (message.message_type !== "done") {
        throw new Error("Expected done message")
      }

      return message.id
    },
    jobTimeoutMs: 100,
  })

  try {
    const stuckJob = pool.queueJob({ id: "stuck", hang: true })
    const nextJob = pool.queueJob({ id: "after-timeout" })

    await expect(stuckJob).rejects.toThrow(/timed out/i)
    await expect(nextJob).resolves.toBe("after-timeout")
  } finally {
    await pool.terminate()
  }
})

test("thread worker pool logs when a job times out", async () => {
  const logs: string[] = []

  const pool = new ThreadWorkerPool<
    TestJob,
    TestJob,
    TestWorkerMessage,
    string
  >({
    concurrency: 1,
    workerEntrypointPath: writeTestWorker(),
    createMessage: (job) => job,
    isLogMessage: (message) => message.message_type === "log",
    getLogLines: (message) =>
      message.message_type === "log" ? message.log_lines : [],
    isCompletionMessage: (message) => message.message_type === "done",
    getResult: (message) => {
      if (message.message_type !== "done") {
        throw new Error("Expected done message")
      }

      return message.id
    },
    jobTimeoutMs: 50,
    onLog: (lines) => logs.push(...lines),
  })

  try {
    await expect(pool.queueJob({ id: "stuck", hang: true })).rejects.toThrow(
      /timed out/i,
    )

    const timeoutLog = logs.find(
      (line) =>
        line.includes("[worker-pool] timeout:") &&
        line.includes("task=stuck") &&
        line.includes("timeout_ms=50"),
    )

    expect(timeoutLog).toBeDefined()
  } finally {
    await pool.terminate()
  }
})

test("thread worker pool emits heartbeat logs when DEBUG=1", async () => {
  const previousDebug = process.env.DEBUG
  process.env.DEBUG = "1"

  const logs: string[] = []
  const pool = new ThreadWorkerPool<
    TestJob,
    TestJob,
    TestWorkerMessage,
    string
  >({
    concurrency: 1,
    workerEntrypointPath: writeTestWorker(),
    createMessage: (job) => job,
    isLogMessage: (message) => message.message_type === "log",
    getLogLines: (message) =>
      message.message_type === "log" ? message.log_lines : [],
    isCompletionMessage: (message) => message.message_type === "done",
    getResult: (message) => {
      if (message.message_type !== "done") {
        throw new Error("Expected done message")
      }

      return message.id
    },
    heartbeatIntervalMs: 20,
    onLog: (lines) => logs.push(...lines),
  })

  try {
    void pool.queueJob({ id: "stuck", hang: true }).catch(() => undefined)

    await new Promise((resolve) => setTimeout(resolve, 80))

    const detailedHeartbeat = logs.find(
      (line) =>
        line.includes("[worker-pool] heartbeat:") &&
        line.includes("task=stuck") &&
        line.includes("running_ms="),
    )

    expect(detailedHeartbeat).toBeDefined()
  } finally {
    await pool.terminate()
    if (previousDebug === undefined) {
      process.env.DEBUG = undefined
    } else {
      process.env.DEBUG = previousDebug
    }
  }
})

test("thread worker pool emits heartbeat logs when DEBUG is not 1", async () => {
  const previousDebug = process.env.DEBUG
  process.env.DEBUG = undefined

  const logs: string[] = []
  const pool = new ThreadWorkerPool<
    TestJob,
    TestJob,
    TestWorkerMessage,
    string
  >({
    concurrency: 1,
    workerEntrypointPath: writeTestWorker(),
    createMessage: (job) => job,
    isLogMessage: (message) => message.message_type === "log",
    getLogLines: (message) =>
      message.message_type === "log" ? message.log_lines : [],
    isCompletionMessage: (message) => message.message_type === "done",
    getResult: (message) => {
      if (message.message_type !== "done") {
        throw new Error("Expected done message")
      }

      return message.id
    },
    heartbeatIntervalMs: 20,
    onLog: (lines) => logs.push(...lines),
  })

  try {
    void pool.queueJob({ id: "stuck", hang: true }).catch(() => undefined)

    await new Promise((resolve) => setTimeout(resolve, 80))

    const detailedHeartbeat = logs.find((line) =>
      line.includes("[worker-pool] heartbeat:"),
    )

    expect(detailedHeartbeat).toBeDefined()
  } finally {
    await pool.terminate()
    if (previousDebug === undefined) {
      process.env.DEBUG = undefined
    } else {
      process.env.DEBUG = previousDebug
    }
  }
})
