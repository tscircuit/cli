import { runInNewContext } from "node:vm"
import { extraRunFrameTabsClientScript } from "lib/site/extra-runframe-tabs-client-script"
import type { TscircuitProjectConfig } from "lib/project-config/project-config-schema"

type ElementId = string
type TestElement = {
  id: string
  textContent: string
  style: { cssText: string }
  setAttribute: (name: string, content: string) => void
  remove: () => void
}

export function createExtraTabsClientFixture() {
  const timers = new Map<number, { callback: () => void; delay: number }>()
  const elements = new Map<ElementId, TestElement>()
  let timerId = 0
  const responses: Array<(response: Response) => void> = []
  const requests: Array<{ url: string; signal: AbortSignal }> = []
  const initialTabs: NonNullable<TscircuitProjectConfig["extraRunFrameTabs"]> =
    []
  const window = Object.assign(new EventTarget(), {
    TSCIRCUIT_EXTRA_RUNFRAME_TABS: initialTabs,
  })
  const events: Event[] = []
  window.addEventListener("tscircuit:extra-runframe-tabs-change", (event) =>
    events.push(event),
  )
  runInNewContext(extraRunFrameTabsClientScript, {
    window,
    document: {
      getElementById: (id: string) => elements.get(id),
      createElement: () => {
        const element: TestElement = {
          id: "",
          textContent: "",
          style: { cssText: "" },
          setAttribute() {},
          remove: () => {
            elements.delete(element.id)
          },
        }
        return element
      },
      body: {
        append: (element: TestElement) => elements.set(element.id, element),
      },
    },
    fetch: (url: string, options: { signal: AbortSignal }) => {
      requests.push({ url, signal: options.signal })
      return new Promise<Response>((resolve) => {
        responses.push(resolve)
      })
    },
    AbortController,
    Event,
    setTimeout: (callback: () => void, delay: number) => {
      timers.set(++timerId, { callback, delay })
      return timerId
    },
    clearTimeout: (id: number) => timers.delete(id),
  })
  return {
    window,
    requests,
    events,
    elements,
    respond: async (payload: unknown, status = 200) => {
      const respond = responses.shift()
      if (!respond) throw new Error("No pending request")
      respond(Response.json(payload, { status }))
      await new Promise((resolve) => setImmediate(resolve))
    },
    tick: () => {
      const timer = [...timers.entries()].find(
        ([, timer]) => timer.delay === 1000,
      )
      if (!timer)
        throw new Error("Missing refresh timer; requests must not overlap")
      timers.delete(timer[0])
      timer[1].callback()
    },
  }
}
