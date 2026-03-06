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
      const worker = new Worker(this.options.workerEntrypointPath)
      const threadWorker: ThreadWorker<TJob, TResult> = {
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

  private setupWorkerMessageHandling(
    threadWorker: ThreadWorker<TJob, TResult>,
  ): void {
    threadWorker.worker.on("message", (message: TWorkerOutput) => {
      if (this.options.isLogMessage(message)) {
        this.options.onLog?.(this.options.getLogLines(message))
        return
      }

      if (!this.options.isCompletionMessage(message)) {
        return
      }

      const job = threadWorker.currentJob
      if (!job) {
        return
      }

      if (
        this.options.shouldStopOnMessage?.(message) &&
        this.options.cancellationError
      ) {
        void this.stop(this.options.cancellationError)
      }

      job.resolve(this.options.getResult(message))
      threadWorker.currentJob = null
      threadWorker.busy = false
      this.processQueue()
    })
  }

  private setupWorkerErrorHandling(
    threadWorker: ThreadWorker<TJob, TResult>,
  ): void {
    threadWorker.worker.on("error", (error) => {
      if (threadWorker.currentJob) {
        threadWorker.currentJob.reject(error as Error)
        threadWorker.currentJob = null
        threadWorker.busy = false
      }

      this.options.onLog?.([
        `Worker error: ${error instanceof Error ? error.message : String(error)}`,
      ])
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
    await Promise.all(this.workers.map((worker) => worker.worker.terminate()))
    this.workers = []
    this.initialized = false
  }
}
