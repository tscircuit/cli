import fs from "node:fs"
import path from "node:path"
import { Worker } from "node:worker_threads"
import type { PlatformConfig } from "@tscircuit/props"
import type {
  SnapshotCompletedMessage,
  SnapshotFileMessage,
  SnapshotJobResult,
  SnapshotLogMessage,
  SnapshotWorkerOutputMessage,
} from "./worker-types"

export type SnapshotJob = {
  filePath: string
  projectDir: string
  options?: {
    update?: boolean
    threeD?: boolean
    pcbOnly?: boolean
    schematicOnly?: boolean
    forceUpdate?: boolean
    snapshotsDirName?: string
    platformConfig?: PlatformConfig
  }
}

type QueuedJob = SnapshotJob & {
  resolve: (result: SnapshotJobResult) => void
  reject: (error: Error) => void
}

type ThreadWorker = {
  worker: Worker
  busy: boolean
  currentJob: QueuedJob | null
}

const getWorkerEntrypointPath = (): string => {
  const tsPath = path.join(import.meta.dir, "snapshot-worker-entrypoint.ts")
  if (fs.existsSync(tsPath)) {
    return tsPath
  }
  const jsBundledPath = path.join(
    import.meta.dir,
    "build",
    "snapshot-worker-entrypoint.js",
  )
  if (fs.existsSync(jsBundledPath)) {
    return jsBundledPath
  }
  return path.join(import.meta.dir, "snapshot-worker-entrypoint.js")
}

export class SnapshotWorkerPool {
  private workers: ThreadWorker[] = []
  private jobQueue: QueuedJob[] = []
  private concurrency: number
  private onLog?: (lines: string[]) => void
  private workerEntrypointPath: string
  private initialized = false

  constructor(options: {
    concurrency: number
    onLog?: (lines: string[]) => void
  }) {
    this.concurrency = options.concurrency
    this.onLog = options.onLog
    this.workerEntrypointPath = getWorkerEntrypointPath()
  }

  private async initWorkers(): Promise<void> {
    if (this.initialized) return

    for (let i = 0; i < this.concurrency; i++) {
      const worker = new Worker(this.workerEntrypointPath)

      const threadWorker: ThreadWorker = {
        worker,
        busy: false,
        currentJob: null,
      }

      this.setupWorkerMessageHandling(threadWorker)
      this.setupWorkerErrorHandling(threadWorker)

      this.workers.push(threadWorker)
    }

    this.initialized = true
  }

  private setupWorkerMessageHandling(threadWorker: ThreadWorker): void {
    threadWorker.worker.on(
      "message",
      (message: SnapshotWorkerOutputMessage) => {
        if (message.message_type === "snapshot_log") {
          const logMsg = message as SnapshotLogMessage
          if (this.onLog) {
            this.onLog(logMsg.log_lines)
          }
        } else if (message.message_type === "snapshot_completed") {
          const completedMsg = message as SnapshotCompletedMessage
          const job = threadWorker.currentJob

          if (job) {
            job.resolve({
              filePath: completedMsg.file_path,
              ok: completedMsg.ok,
              didUpdate: completedMsg.didUpdate,
              mismatches: completedMsg.mismatches,
              errors: completedMsg.errors,
              warnings: completedMsg.warnings,
            })
            threadWorker.currentJob = null
            threadWorker.busy = false
            this.processQueue()
          }
        }
      },
    )
  }

  private setupWorkerErrorHandling(threadWorker: ThreadWorker): void {
    threadWorker.worker.on("error", (error) => {
      if (threadWorker.currentJob) {
        threadWorker.currentJob.reject(error as Error)
        threadWorker.currentJob = null
        threadWorker.busy = false
      }
      if (this.onLog) {
        this.onLog([
          `Worker error: ${error instanceof Error ? error.message : String(error)}`,
        ])
      }
    })

    threadWorker.worker.on("exit", (code) => {
      if (code !== 0 && threadWorker.currentJob) {
        threadWorker.currentJob.reject(
          new Error(`Worker exited with code ${code}`),
        )
        threadWorker.currentJob = null
        threadWorker.busy = false
      }
    })
  }

  private processQueue(): void {
    if (this.jobQueue.length === 0) return

    const availableWorker = this.workers.find((w) => !w.busy)
    if (!availableWorker) return

    const job = this.jobQueue.shift()
    if (!job) return

    availableWorker.busy = true
    availableWorker.currentJob = job

    const message: SnapshotFileMessage = {
      message_type: "snapshot_file",
      file_path: job.filePath,
      project_dir: job.projectDir,
      options: job.options,
    }

    availableWorker.worker.postMessage(message)
  }

  async queueJob(job: SnapshotJob): Promise<SnapshotJobResult> {
    await this.initWorkers()

    return new Promise((resolve, reject) => {
      const queuedJob: QueuedJob = {
        ...job,
        resolve,
        reject,
      }
      this.jobQueue.push(queuedJob)
      this.processQueue()
    })
  }

  async runUntilComplete(): Promise<void> {
    return new Promise((resolve) => {
      const checkComplete = () => {
        const allIdle = this.workers.every((w) => !w.busy)
        const queueEmpty = this.jobQueue.length === 0

        if (allIdle && queueEmpty) {
          resolve()
        } else {
          setTimeout(checkComplete, 50)
        }
      }
      checkComplete()
    })
  }

  async terminate(): Promise<void> {
    const terminatePromises = this.workers.map((w) => w.worker.terminate())
    await Promise.all(terminatePromises)
    this.workers = []
    this.initialized = false
  }
}

export async function snapshotFilesWithWorkerPool(options: {
  files: string[]
  projectDir: string
  concurrency: number
  snapshotsDirName?: string
  buildOptions?: {
    update?: boolean
    threeD?: boolean
    pcbOnly?: boolean
    schematicOnly?: boolean
    forceUpdate?: boolean
    platformConfig?: PlatformConfig
  }
  onLog?: (lines: string[]) => void
  onJobComplete?: (result: SnapshotJobResult) => void
}): Promise<SnapshotJobResult[]> {
  const pool = new SnapshotWorkerPool({
    concurrency: options.concurrency,
    onLog: options.onLog,
  })

  const results: SnapshotJobResult[] = []
  const promises: Promise<SnapshotJobResult>[] = []

  for (const filePath of options.files) {
    const promise = pool
      .queueJob({
        filePath,
        projectDir: options.projectDir,
        options: {
          ...options.buildOptions,
          snapshotsDirName: options.snapshotsDirName,
        },
      })
      .then((result) => {
        results.push(result)
        if (options.onJobComplete) {
          options.onJobComplete(result)
        }
        return result
      })

    promises.push(promise)
  }

  await Promise.all(promises)
  await pool.terminate()

  return results
}
