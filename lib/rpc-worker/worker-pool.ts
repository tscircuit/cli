import fs from "node:fs"
import path from "node:path"
import { Worker } from "node:worker_threads"
import type {
  RpcCallMessage,
  RpcErrorMessage,
  RpcJob,
  RpcLogMessage,
  RpcResultMessage,
  RpcWorkerInputMessage,
  RpcWorkerOutputMessage,
} from "./types"

type ThreadWorker = {
  worker: Worker
  busy: boolean
  currentJob: RpcJob<any, any> | null
}

const getWorkerEntrypointPath = (): string => {
  const tsPath = path.join(import.meta.dir, "rpc-worker-entrypoint.ts")
  if (fs.existsSync(tsPath)) {
    return tsPath
  }
  const jsBundledPath = path.join(import.meta.dir, "rpc-worker-entrypoint.js")
  if (fs.existsSync(jsBundledPath)) {
    return jsBundledPath
  }
  return path.join(import.meta.dir, "rpc-worker-entrypoint.js")
}

export class RpcWorkerPool {
  private workers: ThreadWorker[] = []
  private jobQueue: RpcJob<any, any>[] = []
  private concurrency: number
  private onLog?: (lines: string[]) => void
  private workerEntrypointPath: string
  private initialized = false
  private service: string

  constructor(options: {
    concurrency: number
    service: string
    onLog?: (lines: string[]) => void
  }) {
    this.concurrency = options.concurrency
    this.onLog = options.onLog
    this.service = options.service
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

    for (const threadWorker of this.workers) {
      threadWorker.worker.postMessage({
        message_type: "rpc_init",
        service: this.service,
      } as { message_type: "rpc_init"; service: string })
    }

    this.initialized = true
  }

  private setupWorkerMessageHandling(threadWorker: ThreadWorker): void {
    threadWorker.worker.on("message", (message: RpcWorkerOutputMessage) => {
      if (message.message_type === "rpc_log") {
        const logMsg = message as RpcLogMessage
        if (this.onLog) {
          this.onLog(logMsg.log_lines)
        }
      } else if (message.message_type === "rpc_result") {
        const resultMsg = message as RpcResultMessage
        if (threadWorker.currentJob) {
          const job = threadWorker.currentJob as RpcJob<any, any>
          threadWorker.currentJob = null
          threadWorker.busy = false
          job.resolve(resultMsg.result)
          this.processNextJob()
        }
      } else if (message.message_type === "rpc_error") {
        const errorMsg = message as RpcErrorMessage
        if (threadWorker.currentJob) {
          const job = threadWorker.currentJob as RpcJob<any, any>
          threadWorker.currentJob = null
          threadWorker.busy = false
          job.reject(new Error(errorMsg.error))
          this.processNextJob()
        }
      }
    })
  }

  private setupWorkerErrorHandling(threadWorker: ThreadWorker): void {
    threadWorker.worker.on("error", (error) => {
      console.error("Worker error:", error)
      if (threadWorker.currentJob) {
        const job = threadWorker.currentJob as RpcJob<any, any>
        threadWorker.currentJob = null
        threadWorker.busy = false
        job.reject(error instanceof Error ? error : new Error(String(error)))
        this.processNextJob()
      }
    })

    threadWorker.worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code}`)
      }
      const index = this.workers.indexOf(threadWorker)
      if (index > -1) {
        this.workers.splice(index, 1)
      }
      if (threadWorker.currentJob) {
        const job = threadWorker.currentJob
        job.reject(new Error(`Worker exited with code ${code}`))
      }
    })
  }

  private processNextJob(): void {
    if (this.jobQueue.length === 0) return

    const availableWorker = this.workers.find((w) => !w.busy)
    if (!availableWorker) return

    const job = this.jobQueue.shift()
    if (!job) return

    availableWorker.busy = true
    availableWorker.currentJob = job

    const message: RpcCallMessage = {
      message_type: "rpc_call",
      id: job.id,
      method: job.method,
      args: job.args,
    }

    availableWorker.worker.postMessage(message)
  }

  async runJob<Args, Result>(method: string, args: Args): Promise<Result> {
    await this.initWorkers()

    return new Promise((resolve, reject) => {
      const job: RpcJob<Args, Result> = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        method,
        args,
        resolve: resolve as (result: any) => void,
        reject,
      }

      const availableWorker = this.workers.find((w) => !w.busy)
      if (availableWorker) {
        availableWorker.busy = true
        availableWorker.currentJob = job

        const message: RpcCallMessage = {
          message_type: "rpc_call",
          id: job.id,
          method: job.method,
          args: job.args,
        }

        availableWorker.worker.postMessage(message)
      } else {
        this.jobQueue.push(job)
      }
    })
  }

  async runJobs<Args, Result>(
    jobs: Array<{ method: string; args: Args }>,
    onJobComplete?: (result: Result, index: number) => void | Promise<void>,
  ): Promise<Result[]> {
    await this.initWorkers()

    const results: Result[] = new Array(jobs.length)

    const jobPromises = jobs.map((job, index) =>
      this.runJob<Args, Result>(job.method, job.args).then((result) => {
        results[index] = result
        if (onJobComplete) {
          onJobComplete(result, index)
        }
      }),
    )

    await Promise.all(jobPromises)

    return results
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.worker.terminate()))
    this.workers = []
    this.jobQueue = []
    this.initialized = false
  }
}

export async function runJobsWithRpcWorkerPool<Args, Result>(options: {
  files: Array<{
    filePath: string
    outputPath?: string
    projectDir: string
    options?: any
  }>
  service: string
  method: string
  concurrency: number
  onLog?: (lines: string[]) => void
  onJobComplete?: (result: Result, index: number) => void | Promise<void>
}): Promise<Result[]> {
  const pool = new RpcWorkerPool({
    concurrency: options.concurrency,
    service: options.service,
    onLog: options.onLog,
  })

  const jobs = options.files.map((f) => ({
    method: options.method,
    args: f,
  }))

  const results = await pool.runJobs(jobs, options.onJobComplete)

  await pool.terminate()

  return results
}
