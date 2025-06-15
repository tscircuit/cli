import { test, expect } from "bun:test"
import { cliConfig } from "lib/cli-config"
import { getIndex } from "lib/site/getIndex"

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
