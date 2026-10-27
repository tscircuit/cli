/** Coalesce saves, read their latest contents at flush time, and serialize uploads. */
export class CoalescedFileSync {
  private pending = new Set<string>()
  private firstChangeAt = 0
  private lastChangeAt = 0
  private timer?: ReturnType<typeof setTimeout>
  private running?: Promise<void>
  private stopped = false

  constructor(
    private sync: (filePath: string) => Promise<void>,
    private onError: (filePath: string, error: unknown) => void,
    private delayMs = 250,
    private maxWaitMs = 1000,
  ) {}

  enqueue(filePath: string) {
    if (this.stopped) return
    if (this.pending.size === 0) this.firstChangeAt = Date.now()
    this.lastChangeAt = Date.now()
    this.pending.add(filePath)
    this.schedule()
  }

  private schedule() {
    clearTimeout(this.timer)
    if (this.stopped || this.pending.size === 0) return
    const due = Math.min(
      this.lastChangeAt + this.delayMs,
      this.firstChangeAt + this.maxWaitMs,
    )
    this.timer = setTimeout(() => this.flush(), Math.max(0, due - Date.now()))
  }

  private flush() {
    if (this.running || this.stopped) return
    const paths = [...this.pending]
    this.pending.clear()
    this.running = (async () => {
      for (const filePath of paths) {
        if (this.stopped) break
        try {
          await this.sync(filePath)
        } catch (error) {
          this.onError(filePath, error)
        }
      }
    })().finally(() => {
      this.running = undefined
      this.schedule()
    })
  }

  async stop() {
    this.stopped = true
    clearTimeout(this.timer)
    this.pending.clear()
    await this.running
  }
}
