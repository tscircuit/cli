import { test, expect } from "bun:test"
import { cliConfig } from "lib/cli-config"
import { createRuntimePlatformConfigClientScript } from "lib/server/runtime-platform-config"
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

test("getIndex injects runtime platform config without sensitive values", async () => {
  const html = await getIndex(
    "index.circuit.tsx",
    "http://localhost:3020/api",
    createRuntimePlatformConfigClientScript({
      partsEngine: {
        findPart: async () => ({ mpn: "LM358" }),
      },
      footprintLibraryMap: {
        ti: async () => ({ footprintCircuitJson: [] }),
      },
      tiPartsEngineConfig: {
        partnerToken: "secret-token",
      } as any,
    } as any),
  )

  expect(html).toContain("window.TSCIRCUIT_RUNTIME_PLATFORM_CONFIG")
  expect(html).toContain("__tsci/runtime-platform-config/call")
  expect(html).not.toContain("secret-token")
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
