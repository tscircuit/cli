import { test, expect } from "bun:test"
import { cliConfig } from "lib/cli-config"
import { getIndex } from "lib/site/getIndex"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"
import { runInNewContext } from "node:vm"

const DUMMY_TOKEN = "dummy-token"

test("getIndex safely injects circuit-scoped tabs before RunFrame loads", async () => {
  const extraRunFrameTabs = [
    {
      tabName: "</script><script>window.injected=true</script>",
      iframeUrl: "https://sysconfig-viewer.tscircuit.com/#gzip+base64/=",
      mainComponentPath: "boards/mspm0.circuit.tsx",
    },
  ]
  const html = await getIndex(
    undefined,
    undefined,
    undefined,
    extraRunFrameTabs,
  )
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  const window: Record<string, unknown> = {}
  runInNewContext(script!, { window })
  expect(window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual(extraRunFrameTabs)
  expect(window.injected).toBeUndefined()
  expect(html.indexOf("window.TSCIRCUIT_EXTRA_RUNFRAME_TABS")).toBeLessThan(
    html.indexOf('<script type="module"'),
  )
})

test("getIndex without extra tabs injects an empty list", async () => {
  expect(await getIndex()).toContain(
    "window.TSCIRCUIT_EXTRA_RUNFRAME_TABS = [];",
  )
})

test("getIndex injects registry token when logged in", async () => {
  const originalToken = cliConfig.get("sessionToken")
  cliConfig.set("sessionToken", DUMMY_TOKEN)
  const html = await getIndex()
  if (originalToken) cliConfig.set("sessionToken", originalToken)
  else cliConfig.delete("sessionToken")

  expect(html).toContain(`window.TSCIRCUIT_REGISTRY_TOKEN = \"${DUMMY_TOKEN}\"`)
})

test("getIndex does not inject registry token when logged out", async () => {
  const originalToken = cliConfig.get("sessionToken")
  cliConfig.delete("sessionToken")
  const html = await getIndex()
  if (originalToken) cliConfig.set("sessionToken", originalToken)

  expect(html).not.toContain("TSCIRCUIT_REGISTRY_TOKEN")
})

test("getStaticIndexHtmlFile output includes file list and omits registry token", () => {
  const originalToken = cliConfig.get("sessionToken")
  cliConfig.set("sessionToken", DUMMY_TOKEN)
  const staticFileList = [
    {
      filePath: "index.circuit.tsx",
      fileStaticAssetUrl: "./index/circuit.json",
    },
  ]
  const html = getStaticIndexHtmlFile({
    files: staticFileList,
    standaloneScriptSrc: "./standalone.min.js",
  })
  if (originalToken) cliConfig.set("sessionToken", originalToken)
  else cliConfig.delete("sessionToken")

  expect(html).toContain("window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = false;")
  expect(html).toContain(
    `window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST = ${JSON.stringify(staticFileList)}`,
  )
  expect(html).not.toContain("TSCIRCUIT_REGISTRY_TOKEN")
  expect(html).toContain(
    '<script type="module" src="./standalone.min.js"></script>',
  )
})
