import { expect, test } from "bun:test"
import { createExtraTabsClientFixture } from "../fixtures/create-extra-tabs-client-fixture"

test("dev client marks failed refreshes stale, recovers, and rejects late replies after page exit", async () => {
  const fixture = createExtraTabsClientFixture()
  const tab = {
    tab_name: "External viewer",
    iframe_url: "https://example.com/#valid",
  }
  await fixture.respond({ tabs: [tab] })
  fixture.tick()
  await fixture.respond({ error: { message: "Invalid configuration" } }, 500)
  expect(
    fixture.elements.get("tscircuit-external-tabs-error")?.textContent,
  ).toContain("out of date")
  expect(fixture.window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual([
    { tabName: tab.tab_name, iframeUrl: tab.iframe_url },
  ])
  expect(fixture.events).toHaveLength(1)
  fixture.tick()
  await fixture.respond({ tabs: [] })
  expect(fixture.elements.size).toBe(0)
  expect(fixture.events).toHaveLength(2)
  fixture.tick()
  fixture.window.dispatchEvent(new Event("pagehide"))
  expect(fixture.requests.at(-1)?.signal.aborted).toBe(true)
  await fixture.respond({ tabs: [tab] })
  expect(fixture.window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual([])
  expect(fixture.events).toHaveLength(2)
})
