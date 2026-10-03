import { expect, test } from "bun:test"
import { getCliConfig } from "lib/cli-config"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("push authenticates with TSCIRCUIT_TOKEN without a saved session or handle", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.delete("sessionToken")
  config.delete("tscircuitHandle")
  config.delete("accountId")
  registryDb.accounts[0].tscircuit_handle = "test-user"
  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = registryDb.accounts[0].account_id

  writeFileSync(path.join(tmpDir, "snippet.tsx"), "// Snippet content")
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand("tsci push")

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
    expect(config.get("sessionToken")).toBeUndefined()
    expect(config.get("tscircuitHandle")).toBeUndefined()
  } finally {
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}, 30_000)
