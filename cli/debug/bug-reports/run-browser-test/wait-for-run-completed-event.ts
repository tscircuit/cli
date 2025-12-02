import type { EventsWatcher } from "lib/server/EventsWatcher"

const WAIT_FOR_RUN_COMPLETED_TIMEOUT_MS = 60_000

export const waitForRunCompletedEvent = (eventsWatcher: EventsWatcher) =>
  new Promise<{ errors?: any[]; hasExecutionError?: boolean }>(
    (resolve, reject) => {
      const onRunCompleted = (event: {
        errors?: any[]
        hasExecutionError?: boolean
      }) => {
        clearTimeout(timeoutId)
        eventsWatcher.off("RUN_COMPLETED", onRunCompleted)
        resolve(event)
      }

      const timeoutId = globalThis.setTimeout(() => {
        eventsWatcher.off("RUN_COMPLETED", onRunCompleted)
        reject(
          new Error(
            `Timed out waiting for RUN_COMPLETED after ${WAIT_FOR_RUN_COMPLETED_TIMEOUT_MS / 1000}s`,
          ),
        )
      }, WAIT_FOR_RUN_COMPLETED_TIMEOUT_MS)

      eventsWatcher.on("RUN_COMPLETED", onRunCompleted)
    },
  )
