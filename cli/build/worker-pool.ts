import fs from "node:fs"
import path from "node:path"
import { Worker } from "node:worker_threads"
import type { PlatformConfig } from "@tscircuit/props"
import type {
  BuildCompletedMessage,
  BuildFileMessage,
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
    profile?: boolean
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
  // Check for .ts file first (development), then .js (published/dist)
  const tsPath = path.join(import.meta.dir, "build-worker-entrypoint.ts")
  if (fs.existsSync(tsPath)) {
    return tsPath
  }
  // When bundled, main.js is in dist/ and worker is in dist/build/
  const jsBundledPath = path.join(
    import.meta.dir,
    "build",
    "build-worker-entrypoint.js",
  )
  if (fs.existsSync(jsBundledPath)) {
    return jsBundledPath
  }
  // Fallback: same directory
  return path.join(import.meta.dir, "build-worker-entrypoint.js")
}

export class WorkerPool {
  private workers: ThreadWorker[] = []
  private jobQueue: QueuedJob[] = []
  private concurrency: number
  private onLog?: (lines: string[]) => void
  private workerEntrypointPath: string
  private initialized = false
  private stopped = false
  private stopReason: Error | null = null
  private stopOnFatal = false
  private cancellationError: Error | null = null

  constructor(options: {
    concurrency: number
    onLog?: (lines: string[]) => void
    stopOnFatal?: boolean
    cancellationError?: Error
  }) {
    this.concurrency = options.concurrency
    this.onLog = options.onLog
    this.workerEntrypointPath = getWorkerEntrypointPath()
    this.stopOnFatal = options.stopOnFatal ?? false
    this.cancellationError = options.cancellationError ?? null
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
          if (
            this.stopOnFatal &&
            completedMsg.isFatalError &&
            this.cancellationError
          ) {
            void this.stop(this.cancellationError)
          }

          job.resolve({
            filePath: completedMsg.file_path,
            outputPath: completedMsg.output_path,
            ok: completedMsg.ok,
            isFatalError: completedMsg.isFatalError,
            errors: completedMsg.errors,
            warnings: completedMsg.warnings,
            durationMs: completedMsg.durationMs,
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
    if (this.stopped) return
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
    if (this.stopped) {
      return Promise.reject(this.stopReason ?? new Error("Worker pool stopped"))
    }

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

  async stop(reason: Error): Promise<void> {
    if (this.stopped) return

    this.stopped = true
    this.stopReason = reason

    // Reject queued jobs that have not started yet
    for (const queuedJob of this.jobQueue) {
      queuedJob.reject(reason)
    }
    this.jobQueue = []
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
    profile?: boolean
  }
  onLog?: (lines: string[]) => void
  onJobComplete?: (result: BuildJobResult) => void
  stopOnFatal?: boolean
}): Promise<BuildJobResult[]> {
  const cancellationError = new Error("Build cancelled due fatal error")
  const poolConcurrency = Math.max(
    1,
    Math.min(options.concurrency, options.files.length),
  )
  const pool = new WorkerPool({
    concurrency: poolConcurrency,
    onLog: options.onLog,
    stopOnFatal: options.stopOnFatal,
    cancellationError,
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
      .then(async (result) => {
        results.push(result)
        if (options.onJobComplete) {
          await options.onJobComplete(result)
        }

        return result
      })

    promises.push(promise)
  }

  const settledResults = await Promise.allSettled(promises)

  for (const settledResult of settledResults) {
    if (
      settledResult.status === "rejected" &&
      settledResult.reason !== cancellationError
    ) {
      throw settledResult.reason
    }
  }

  // NOTE: In some Bun runtimes, terminating worker threads here can cause the
  // parent process to exit before post-build steps (site/preview/transpile)
  // run. The CLI exits explicitly at the end of the build command, so on Bun
  // we let process shutdown clean up workers.
  if (typeof Bun === "undefined") {
    await pool.terminate()
  }

  return results
}
