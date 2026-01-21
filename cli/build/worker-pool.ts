import path from "node:path"
import { Worker } from "node:worker_threads"
import type { PlatformConfig } from "@tscircuit/props"
import type {
  BuildFileMessage,
  BuildCompletedMessage,
  BuildJobResult,
  WorkerLogMessage,
  WorkerOutputMessage,
} from "./worker-types"

export type BuildJob = {
  filePath: string
  outputPath: string
  projectDir: string
  options?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
    platformConfig?: PlatformConfig
  }
}

type QueuedJob = BuildJob & {
  resolve: (result: BuildJobResult) => void
  reject: (error: Error) => void
}

type ThreadWorker = {
  worker: Worker
  busy: boolean
  currentJob: QueuedJob | null
}

const getWorkerEntrypointPath = (): string => {
  return path.join(import.meta.dir, "build-worker-entrypoint.ts")
}

export class WorkerPool {
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
    threadWorker.worker.on("message", (message: WorkerOutputMessage) => {
      if (message.message_type === "worker_log") {
        const logMsg = message as WorkerLogMessage
        if (this.onLog) {
          this.onLog(logMsg.log_lines)
        }
      } else if (message.message_type === "build_completed") {
        const completedMsg = message as BuildCompletedMessage
        const job = threadWorker.currentJob

        if (job) {
          job.resolve({
            filePath: completedMsg.file_path,
            outputPath: completedMsg.output_path,
            ok: completedMsg.ok,
            errors: completedMsg.errors,
            warnings: completedMsg.warnings,
          })
          threadWorker.currentJob = null
          threadWorker.busy = false
          this.processQueue()
        }
      }
    })
  }

  private setupWorkerErrorHandling(threadWorker: ThreadWorker): void {
    threadWorker.worker.on("error", (error) => {
      if (threadWorker.currentJob) {
        threadWorker.currentJob.reject(error)
        threadWorker.currentJob = null
        threadWorker.busy = false
      }
      if (this.onLog) {
        this.onLog([`Worker error: ${error.message}`])
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

    const message: BuildFileMessage = {
      message_type: "build_file",
      file_path: job.filePath,
      output_path: job.outputPath,
      project_dir: job.projectDir,
      options: job.options,
    }

    availableWorker.worker.postMessage(message)
  }

  async queueJob(job: BuildJob): Promise<BuildJobResult> {
    // Initialize workers on first job
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

/**
 * Build multiple files in parallel using worker threads.
 * Workers are spawned once and reused for multiple files.
 * Circuit JSON is written to disk, not passed through IPC.
 */
export async function buildFilesWithWorkerPool(options: {
  files: Array<{
    filePath: string
    outputPath: string
  }>
  projectDir: string
  concurrency: number
  buildOptions?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
    platformConfig?: PlatformConfig
  }
  onLog?: (lines: string[]) => void
  onJobComplete?: (result: BuildJobResult) => void
}): Promise<BuildJobResult[]> {
  const pool = new WorkerPool({
    concurrency: options.concurrency,
    onLog: options.onLog,
  })

  const results: BuildJobResult[] = []
  const promises: Promise<BuildJobResult>[] = []

  for (const file of options.files) {
    const promise = pool
      .queueJob({
        filePath: file.filePath,
        outputPath: file.outputPath,
        projectDir: options.projectDir,
        options: options.buildOptions,
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
