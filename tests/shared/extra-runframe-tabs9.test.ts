import { expect, test } from "bun:test"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"
import { tabs } from "../fixtures/extra-runframe-tabs"
import { runInNewContext } from "node:vm"

test("static site injects tabs before the bundle and safely round-trips script-like text", () => {
  const maliciousTab = {
    tabName: "</script><script>window.injected=true</script>\u2028\u2029",
    iframeUrl:
      "https://example.com/#</script><script>window.injected=true</script>",
    mainComponentPath: 'boards/"<board>.circuit.tsx',
  }
  const extraRunFrameTabs = [...tabs, maliciousTab]
  const html = getStaticIndexHtmlFile({ files: [], extraRunFrameTabs })
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  expect(script).toBeDefined()
  expect(script).not.toContain("</script>")
  const window: Record<string, unknown> = {}
  runInNewContext(script!, { window })
  expect(window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual(extraRunFrameTabs)
  expect(window.injected).toBeUndefined()
  expect(html.indexOf("window.TSCIRCUIT_EXTRA_RUNFRAME_TABS")).toBeLessThan(
    html.indexOf('<script type="module"'),
  )
})
