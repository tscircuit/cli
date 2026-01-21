import path from "node:path"
import type { Subprocess, FileSink } from "bun"
import type { PlatformConfig } from "@tscircuit/props"
import type {
  BuildFileMessage,
  BuildCompletedMessage,
  WorkerOutputMessage,
  BuildJobResult,
  WorkerLogMessage,
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

type PersistentWorker = {
  process: Subprocess
  busy: boolean
  currentJob: QueuedJob | null
  outputBuffer: string
  ready: boolean
}

const getWorkerEntrypointPath = (): string => {
  return path.join(import.meta.dir, "build-worker-entrypoint.ts")
}

export class WorkerPool {
  private workers: PersistentWorker[] = []
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

    const workerReadyPromises: Promise<void>[] = []

    for (let i = 0; i < this.concurrency; i++) {
      const proc = Bun.spawn(["bun", "run", this.workerEntrypointPath], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      })

      const worker: PersistentWorker = {
        process: proc,
        busy: false,
        currentJob: null,
        outputBuffer: "",
        ready: false,
      }

      this.workers.push(worker)

      const readyPromise = this.setupWorkerOutputHandling(worker)
      workerReadyPromises.push(readyPromise)
      this.setupWorkerStderrHandling(worker)
    }

    // Wait for all workers to signal ready
    await Promise.all(workerReadyPromises)
    this.initialized = true
  }

  private setupWorkerOutputHandling(worker: PersistentWorker): Promise<void> {
    return new Promise((resolveReady) => {
      const stdout = worker.process.stdout
      if (typeof stdout === "number" || !stdout) {
        resolveReady()
        return
      }
      const reader = stdout.getReader()
      const decoder = new TextDecoder()

      const readOutput = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            worker.outputBuffer += decoder.decode(value, { stream: true })

            // Check for ready signal
            if (
              !worker.ready &&
              worker.outputBuffer.includes("__WORKER_READY__")
            ) {
              worker.ready = true
              worker.outputBuffer = worker.outputBuffer.replace(
                "__WORKER_READY__\n",
                "",
              )
              resolveReady()
            }

            // Process any complete messages
            this.processWorkerOutput(worker)
          }
        } catch {
          if (worker.currentJob) {
            worker.currentJob.reject(
              new Error("Worker process ended unexpectedly"),
            )
            worker.currentJob = null
            worker.busy = false
          }
        }
      }

      readOutput()
    })
  }

  private setupWorkerStderrHandling(worker: PersistentWorker): void {
    const stderr = worker.process.stderr
    if (typeof stderr === "number" || !stderr) {
      return
    }
    const reader = stderr.getReader()
    const decoder = new TextDecoder()

    const readStderr = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          if (text.trim() && this.onLog) {
            this.onLog(text.split("\n").filter((line) => line.trim()))
          }
        }
      } catch {
        // Ignore stderr read errors
      }
    }

    readStderr()
  }

  private processWorkerOutput(worker: PersistentWorker): void {
    // Split by message delimiter
    const parts = worker.outputBuffer.split("__MSG_END__\n")
    worker.outputBuffer = parts.pop() || ""

    for (const part of parts) {
      const lines = part.split("\n").filter((line) => line.trim())

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as WorkerOutputMessage

          if (parsed.message_type === "worker_log") {
            const logMsg = parsed as WorkerLogMessage
            if (this.onLog) {
              this.onLog(logMsg.log_lines)
            }
          } else if (parsed.message_type === "build_completed") {
            const completedMsg = parsed as BuildCompletedMessage
            const job = worker.currentJob

            if (job) {
              job.resolve({
                filePath: completedMsg.file_path,
                outputPath: completedMsg.output_path,
                ok: completedMsg.ok,
                errors: completedMsg.errors,
                warnings: completedMsg.warnings,
              })
              worker.currentJob = null
              worker.busy = false
              this.processQueue()
            }
          }
        } catch {
          // Not JSON, treat as log output
          if (line.trim() && this.onLog) {
            this.onLog([line])
          }
        }
      }
    }
  }

  private processQueue(): void {
    if (this.jobQueue.length === 0) return

    const availableWorker = this.workers.find((w) => w.ready && !w.busy)
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

    // Send job to worker via stdin
    const stdin = availableWorker.process.stdin
    if (typeof stdin === "number" || !stdin) {
      throw new Error("Worker stdin is not a FileSink")
    }
    stdin.write(`${JSON.stringify(message)}\n`)
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
    for (const worker of this.workers) {
      worker.process.kill()
    }
    this.workers = []
    this.initialized = false
  }
}

/**
 * Build multiple files in parallel using persistent worker processes.
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
