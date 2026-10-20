import { expect, test } from "bun:test"
import { getIndex } from "lib/site/getIndex"
import { runInNewContext } from "node:vm"

test("getIndex safely injects circuit-scoped tabs before RunFrame loads", async () => {
  const extraRunFrameTabs = [
    {
      tabName: "</script><script>window.injected=true</script>",
      iframeUrl: "https://sysconfig-viewer.tscircuit.com/#gzip+base64/=",
      mainComponentPath: "boards/mspm0.circuit.tsx",
    },
  ]
  const html = await getIndex({
    extraRunFrameTabs,
  })
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  const window: Record<string, unknown> = {}
  runInNewContext(script!, { window })
  expect(window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual(extraRunFrameTabs)
  expect(window.injected).toBeUndefined()
  expect(html.indexOf("window.TSCIRCUIT_EXTRA_RUNFRAME_TABS")).toBeLessThan(
    html.indexOf('<script type="module"'),
  )
})
