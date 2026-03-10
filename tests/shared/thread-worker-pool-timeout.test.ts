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
