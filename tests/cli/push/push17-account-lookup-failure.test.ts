import { expect, test } from "bun:test"
import { getCliConfig } from "lib/cli-config"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("push reports the account lookup error instead of a missing handle when TSCIRCUIT_TOKEN is set", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.delete("sessionToken")
  config.delete("tscircuitHandle")
  config.delete("accountId")

  const failingRegistry = Bun.serve({
    port: 0,
    fetch: () => new Response("Service Unavailable", { status: 503 }),
  })
  config.set("registryApiUrl", `http://localhost:${failingRegistry.port}/api`)

  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = registryDb.accounts[0].account_id

  writeFileSync(path.join(tmpDir, "snippet.tsx"), "// Snippet content")
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  try {
    const { stderr, exitCode } = await runCommand("tsci push")

    expect(exitCode).toBe(1)
    expect(stderr).toContain("Could not look up your tscircuit account")
    expect(stderr).toContain("503")
    expect(stderr).not.toContain("You need to set your tscircuit handle")
  } finally {
    failingRegistry.stop()
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}, 30_000)
