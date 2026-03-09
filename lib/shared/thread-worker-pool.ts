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
}

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

    this.initialized = true
  }

  private createThreadWorker(): ThreadWorker<TJob, TResult> {
    const threadWorker: ThreadWorker<TJob, TResult> = {
      worker: new Worker(this.options.workerEntrypointPath),
      busy: false,
      currentJob: null,
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

    if (!this.options.jobTimeoutMs || this.options.jobTimeoutMs <= 0) {
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
        `Worker job timed out after ${this.options.jobTimeoutMs}ms`,
      )

      timedOutJob.reject(timeoutError)
      this.replaceWorker(threadWorker)
      this.processQueue()
    }, this.options.jobTimeoutMs)
  }

  private replaceWorker(threadWorker: ThreadWorker<TJob, TResult>): void {
    this.clearWorkerTimeout(threadWorker)
    void threadWorker.worker.terminate().catch(() => undefined)

    threadWorker.worker = new Worker(this.options.workerEntrypointPath)
    threadWorker.busy = false
    threadWorker.currentJob = null

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
    this.stopReason = reason
    for (const queuedJob of this.jobQueue) {
      queuedJob.reject(reason)
    }
    this.jobQueue = []
  }

  async terminate(): Promise<void> {
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
