import { EventEmitter } from "events"

interface Event {
  event_id: string
  created_at: string
  event_type: string
  [key: string]: any
}

interface EventsResponse {
  event_list: Event[]
}

export class EventsWatcher extends EventEmitter {
  private lastPollTime: string
  private pollInterval: number
  private baseUrl: string
  private polling = false
  private timeoutId?: NodeJS.Timeout

  constructor(baseUrl = "http://localhost:3000", pollInterval = 1000) {
    super()
    this.baseUrl = baseUrl
    this.pollInterval = pollInterval
    this.lastPollTime = new Date().toISOString()
  }

  async start() {
    if (this.polling) return
    this.polling = true
    await this.poll()
  }

  stop() {
    this.polling = false
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
  }

  private async poll() {
    if (!this.polling) return

    try {
      const response = await fetch(
        `${this.baseUrl}/api/events/list?since=${encodeURIComponent(this.lastPollTime)}`,
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: EventsResponse = await response.json()

      // Update last poll time to latest event or current time
      const latestEvent = data.event_list[data.event_list.length - 1]
      this.lastPollTime = latestEvent
        ? latestEvent.created_at
        : new Date().toISOString()

      // Emit events in chronological order
      data.event_list.forEach((event) => {
        this.emit(event.event_type, event)
        this.emit("*", event)
      })
    } catch (error) {
      this.emit("error", error)
    }
    // Schedule next poll
    this.timeoutId = globalThis.setTimeout(
      () => this.poll(),
      this.pollInterval,
    ) as unknown as NodeJS.Timeout
  }
}
