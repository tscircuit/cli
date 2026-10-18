import { expect, test } from "bun:test"
import { createExtraTabsClientFixture } from "../fixtures/create-extra-tabs-client-fixture"

test("restoring a cached page ignores pre-navigation responses and restarts one polling loop", async () => {
  const fixture = createExtraTabsClientFixture()
  fixture.window.dispatchEvent(new Event("pagehide"))
  const restored = new Event("pageshow")
  Object.defineProperty(restored, "persisted", { value: true })
  fixture.window.dispatchEvent(restored)
  expect(fixture.requests).toHaveLength(2)
  await fixture.respond({
    tabs: [{ tab_name: "Old", iframe_url: "https://example.com/#old" }],
  })
  expect(fixture.events).toHaveLength(0)
  expect(() => fixture.tick()).toThrow("Missing refresh timer")
  await fixture.respond({
    tabs: [{ tab_name: "Current", iframe_url: "https://example.com/#current" }],
  })
  expect(fixture.window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual([
    { tabName: "Current", iframeUrl: "https://example.com/#current" },
  ])
  fixture.tick()
  expect(fixture.requests).toHaveLength(3)
  fixture.window.dispatchEvent(new Event("pagehide"))
  expect(fixture.requests.at(-1)?.signal.aborted).toBe(true)
})
