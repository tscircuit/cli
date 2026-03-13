import { Worker } from "node:worker_threads"

type QueuedJob<TJob, TResult> = {
  job: TJob
  resolve: (result: TResult) => void
  reject: (error: Error) => void
}

type ThreadWorker<TJob, TResult> = {
  worker: Worker
  busy: boolean
  currentJob: QueuedJob<TJob, TResult> | null
  currentJobStartedAt: number | null
  timeoutId: NodeJS.Timeout | null
}

type ThreadWorkerPoolOptions<TJob, TWorkerInput, TWorkerOutput, TResult> = {
  concurrency: number
  workerEntrypointPath: string
  createMessage: (job: TJob) => TWorkerInput
  isLogMessage: (message: TWorkerOutput) => boolean
  getLogLines: (message: TWorkerOutput) => string[]
  isCompletionMessage: (message: TWorkerOutput) => boolean
  getResult: (message: TWorkerOutput) => TResult
  shouldStopOnMessage?: (message: TWorkerOutput) => boolean
  onLog?: (lines: string[]) => void
  cancellationError?: Error
  jobTimeoutMs?: number
  heartbeatIntervalMs?: number
  describeJob?: (job: TJob) => string
}

const DEFAULT_WORKER_JOB_TIMEOUT_MS = 3 * 60 * 1000

export class ThreadWorkerPool<TJob, TWorkerInput, TWorkerOutput, TResult> {
  private workers: Array<ThreadWorker<TJob, TResult>> = []
  private jobQueue: Array<QueuedJob<TJob, TResult>> = []
  private concurrency: number
  private options: ThreadWorkerPoolOptions<
    TJob,
    TWorkerInput,
    TWorkerOutput,
    TResult
  >
  private initialized = false
  private stopped = false
  private stopReason: Error | null = null
  private heartbeatIntervalId: NodeJS.Timeout | null = null

  constructor(
    options: ThreadWorkerPoolOptions<
      TJob,
      TWorkerInput,
      TWorkerOutput,
      TResult
    >,
  ) {
    this.options = options
    this.concurrency = options.concurrency
  }

  private async initWorkers(): Promise<void> {
    if (this.initialized) return

    for (let i = 0; i < this.concurrency; i++) {
      this.workers.push(this.createThreadWorker())
    }

    this.startHeartbeat()
    this.initialized = true
  }

  private describeJob(job: TJob): string {
    if (this.options.describeJob) {
      return this.options.describeJob(job)
    }

    if (typeof job === "object" && job !== null) {
      const jobCandidate = job as Record<string, unknown>
      if (typeof jobCandidate.filePath === "string") {
        return jobCandidate.filePath
      }
      if (typeof jobCandidate.id === "string") {
        return jobCandidate.id
      }
      if (typeof jobCandidate.outputPath === "string") {
        return jobCandidate.outputPath
      }
    }

    return "unknown-job"
  }

  private startHeartbeat(): void {
    if (!this.options.onLog || this.heartbeatIntervalId) {
      return
    }

    if (process.env.DEBUG !== "1") {
      return
    }

    const heartbeatIntervalMs = this.options.heartbeatIntervalMs ?? 5000
    if (heartbeatIntervalMs <= 0) {
      return
    }

    this.heartbeatIntervalId = setInterval(() => {
      const busyWorkers = this.workers.filter((worker) => worker.busy).length
      const totalWorkers = this.workers.length
      const idleWorkers = totalWorkers - busyWorkers
      const queuedJobs = this.jobQueue.length
      const now = Date.now()
      const workerDetails = this.workers.map((worker, index) => {
        if (!worker.busy || !worker.currentJob || !worker.currentJobStartedAt) {
          return `w${index}:idle`
        }

        const runningForMs = now - worker.currentJobStartedAt
        const jobDescription = this.describeJob(worker.currentJob.job)
        return `w${index}:busy task=${jobDescription} running_ms=${runningForMs}`
      })

      this.options.onLog?.([
        `[worker-pool] heartbeat: workers busy=${busyWorkers}/${totalWorkers}, idle=${idleWorkers}, queued_jobs=${queuedJobs} | ${workerDetails.join(" | ")}`,
      ])
    }, heartbeatIntervalMs)

    this.heartbeatIntervalId.unref?.()
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatIntervalId) {
      return
    }

    clearInterval(this.heartbeatIntervalId)
    this.heartbeatIntervalId = null
  }

  private createThreadWorker(): ThreadWorker<TJob, TResult> {
    const threadWorker: ThreadWorker<TJob, TResult> = {
      worker: new Worker(this.options.workerEntrypointPath),
      busy: false,
      currentJob: null,
      currentJobStartedAt: null,
      timeoutId: null,
    }

    this.attachWorkerHandlers(threadWorker)

    return threadWorker
  }

  private clearWorkerTimeout(threadWorker: ThreadWorker<TJob, TResult>): void {
    if (threadWorker.timeoutId) {
      clearTimeout(threadWorker.timeoutId)
      threadWorker.timeoutId = null
    }
  }

  private startJobTimeout(threadWorker: ThreadWorker<TJob, TResult>): void {
    this.clearWorkerTimeout(threadWorker)

    const timeoutMs =
      this.options.jobTimeoutMs === undefined
        ? DEFAULT_WORKER_JOB_TIMEOUT_MS
        : this.options.jobTimeoutMs

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return
    }

    const job = threadWorker.currentJob
    if (!job) {
      return
    }

    threadWorker.timeoutId = setTimeout(() => {
      const timedOutJob = threadWorker.currentJob
      if (!timedOutJob) {
        return
      }

      const timeoutError = new Error(
        `Worker job timed out after ${timeoutMs}ms`,
      )

      timedOutJob.reject(timeoutError)
      this.replaceWorker(threadWorker)
      this.processQueue()
    }, timeoutMs)
  }

  private replaceWorker(threadWorker: ThreadWorker<TJob, TResult>): void {
    this.clearWorkerTimeout(threadWorker)
    void threadWorker.worker.terminate().catch(() => undefined)

    threadWorker.worker = new Worker(this.options.workerEntrypointPath)
    threadWorker.busy = false
    threadWorker.currentJob = null
    threadWorker.currentJobStartedAt = null

    this.attachWorkerHandlers(threadWorker)
  }

  private finishJob(
    threadWorker: ThreadWorker<TJob, TResult>,
    action: (job: QueuedJob<TJob, TResult>) => void,
  ): void {
    const job = threadWorker.currentJob
    if (!job) {
      return
    }

    this.clearWorkerTimeout(threadWorker)
    threadWorker.currentJob = null
    threadWorker.currentJobStartedAt = null
    threadWorker.busy = false
    action(job)
    this.processQueue()
  }

  private attachWorkerHandlers(
    threadWorker: ThreadWorker<TJob, TResult>,
  ): void {
    const worker = threadWorker.worker

    worker.on("message", (message: TWorkerOutput) => {
      if (threadWorker.worker !== worker) {
        return
      }

      if (this.options.isLogMessage(message)) {
        this.options.onLog?.(this.options.getLogLines(message))
        return
      }

      if (!this.options.isCompletionMessage(message)) {
        return
      }

      this.finishJob(threadWorker, (job) => {
        if (
          this.options.shouldStopOnMessage?.(message) &&
          this.options.cancellationError
        ) {
          void this.stop(this.options.cancellationError)
        }

        job.resolve(this.options.getResult(message))
      })
    })

    worker.on("error", (error) => {
      if (threadWorker.worker !== worker) {
        return
      }

      this.finishJob(threadWorker, (job) => {
        job.reject(error as Error)
      })

      this.options.onLog?.([
        `Worker error: ${error instanceof Error ? error.message : String(error)}`,
      ])

      this.replaceWorker(threadWorker)
      this.processQueue()
    })

    worker.on("exit", (code) => {
      if (threadWorker.worker !== worker) {
        return
      }

      if (code !== 0) {
        this.finishJob(threadWorker, (job) => {
          job.reject(new Error(`Worker exited with code ${code}`))
        })

        this.replaceWorker(threadWorker)
        this.processQueue()
      }
    })
  }

  private processQueue(): void {
    if (this.stopped || this.jobQueue.length === 0) {
      return
    }

    const availableWorker = this.workers.find((worker) => !worker.busy)
    if (!availableWorker) {
      return
    }

    const queuedJob = this.jobQueue.shift()
    if (!queuedJob) {
      return
    }

    availableWorker.busy = true
    availableWorker.currentJob = queuedJob
    availableWorker.currentJobStartedAt = Date.now()
    this.startJobTimeout(availableWorker)
    availableWorker.worker.postMessage(
      this.options.createMessage(queuedJob.job),
    )
  }

  async queueJob(job: TJob): Promise<TResult> {
    if (this.stopped) {
      return Promise.reject(this.stopReason ?? new Error("Worker pool stopped"))
    }

    await this.initWorkers()

    return new Promise((resolve, reject) => {
      this.jobQueue.push({ job, resolve, reject })
      this.processQueue()
    })
  }

  async stop(reason: Error): Promise<void> {
    if (this.stopped) return

    this.stopped = true
    this.stopHeartbeat()
    this.stopReason = reason
    for (const queuedJob of this.jobQueue) {
      queuedJob.reject(reason)
    }
    this.jobQueue = []
  }

  async terminate(): Promise<void> {
    this.stopHeartbeat()
    await Promise.all(
      this.workers.map((worker) => {
        this.clearWorkerTimeout(worker)
        return worker.worker.terminate()
      }),
    )
    this.workers = []
    this.initialized = false
  }
}
