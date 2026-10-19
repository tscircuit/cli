import { test, expect } from "bun:test"
import { cliConfig } from "lib/cli-config"
import { getIndex } from "lib/site/getIndex"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"

const DUMMY_TOKEN = "dummy-token"

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
