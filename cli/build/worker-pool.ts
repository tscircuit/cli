import path from "node:path"
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

const getWorkerEntrypointPath = (): string => {
  return path.join(import.meta.dir, "build-worker-entrypoint.ts")
}

export class WorkerPool {
  private activeProcesses = 0
  private jobQueue: QueuedJob[] = []
  private concurrency: number
  private onLog?: (lines: string[]) => void
  private workerEntrypointPath: string

  constructor(options: {
    concurrency: number
    onLog?: (lines: string[]) => void
  }) {
    this.concurrency = options.concurrency
    this.onLog = options.onLog
    this.workerEntrypointPath = getWorkerEntrypointPath()
  }

  private async runJob(job: QueuedJob): Promise<void> {
    this.activeProcesses++

    const message: BuildFileMessage = {
      message_type: "build_file",
      file_path: job.filePath,
      output_path: job.outputPath,
      project_dir: job.projectDir,
      options: job.options,
    }

    try {
      const proc = Bun.spawn(
        ["bun", "run", this.workerEntrypointPath, JSON.stringify(message)],
        {
          cwd: job.projectDir,
          stdout: "pipe",
          stderr: "pipe",
        },
      )

      const stdout = await new Response(proc.stdout).text()
      const stderr = await new Response(proc.stderr).text()
      await proc.exited

      // Parse output lines looking for JSON messages
      const lines = stdout.split("\n").filter((line) => line.trim())
      let completedMessage: BuildCompletedMessage | null = null

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as WorkerOutputMessage
          if (parsed.message_type === "worker_log") {
            const logMsg = parsed as WorkerLogMessage
            if (this.onLog) {
              this.onLog(logMsg.log_lines)
            }
          } else if (parsed.message_type === "build_completed") {
            completedMessage = parsed as BuildCompletedMessage
          }
        } catch {
          // Not JSON, might be other console output - treat as log
          if (line.trim() && this.onLog) {
            this.onLog([line])
          }
        }
      }

      // Log any stderr output
      if (stderr.trim() && this.onLog) {
        this.onLog(stderr.split("\n").filter((line) => line.trim()))
      }

      if (completedMessage) {
        job.resolve({
          filePath: completedMessage.file_path,
          outputPath: completedMessage.output_path,
          ok: completedMessage.ok,
          circuitJson: completedMessage.circuit_json,
          errors: completedMessage.errors,
          warnings: completedMessage.warnings,
        })
      } else {
        // No completion message - something went wrong
        job.reject(
          new Error(
            `Worker process failed without completion message. stderr: ${stderr}`,
          ),
        )
      }
    } catch (err) {
      job.reject(
        err instanceof Error ? err : new Error(`Worker process error: ${err}`),
      )
    } finally {
      this.activeProcesses--
      this.processQueue()
    }
  }

  private processQueue() {
    while (
      this.jobQueue.length > 0 &&
      this.activeProcesses < this.concurrency
    ) {
      const job = this.jobQueue.shift()
      if (job) {
        this.runJob(job)
      }
    }
  }

  queueJob(job: BuildJob): Promise<BuildJobResult> {
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
        const allIdle = this.activeProcesses === 0
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
    // Subprocesses are managed per-job, no persistent workers to terminate
  }
}

/**
 * Build multiple files in parallel using a worker pool
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
