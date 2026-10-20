import { expect, test } from "bun:test"
import { createExtraTabsClientFixture } from "../fixtures/create-extra-tabs-client-fixture"

test("dev client delivers changed URLs and removals without reloading or overlapping requests", async () => {
  const fixture = createExtraTabsClientFixture()
  const tab = {
    tab_name: "External viewer",
    iframe_url: "https://example.com/#before",
    main_component_path: "index.tsx",
  }
  expect(fixture.requests).toHaveLength(1)
  expect(() => fixture.tick()).toThrow("Missing refresh timer")
  await fixture.respond({ tabs: [tab] })
  expect(fixture.window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual([
    {
      tabName: tab.tab_name,
      iframeUrl: tab.iframe_url,
      mainComponentPath: "index.tsx",
    },
  ])
  expect(fixture.events).toHaveLength(1)
  fixture.tick()
  await fixture.respond({ tabs: [tab] })
  expect(fixture.events).toHaveLength(1)
  fixture.tick()
  await fixture.respond({
    tabs: [{ ...tab, iframe_url: "https://example.com/#after" }],
  })
  expect(fixture.events).toHaveLength(2)
  expect(fixture.window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual([
    {
      tabName: tab.tab_name,
      iframeUrl: "https://example.com/#after",
      mainComponentPath: "index.tsx",
    },
  ])
  fixture.tick()
  await fixture.respond({ tabs: [] })
  expect(fixture.window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual([])
  expect(fixture.events).toHaveLength(3)
  fixture.window.dispatchEvent(new Event("pagehide"))
})
