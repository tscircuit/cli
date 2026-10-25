import { expect, test } from "bun:test"
import { getCliConfig } from "lib/cli-config"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("push reports account lookup failure instead of a missing handle", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.delete("sessionToken")
  config.delete("tscircuitHandle")
  config.delete("accountId")
  const failingRegistry = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        { error: { error_code: "service_unavailable", message: "Outage" } },
        { status: 503 },
      ),
  })
  config.set("registryApiUrl", `http://localhost:${failingRegistry.port}`)
  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = "token-for-unknown-account"

  writeFileSync(path.join(tmpDir, "snippet.tsx"), "// Snippet content")
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand("tsci push")
    const output = stdout + stderr

    expect(exitCode).toBe(1)
    expect(output).toContain("Could not verify your account for publishing")
    expect(output).toContain("503")
    expect(output).not.toContain("You need to set your tscircuit handle")
  } finally {
    await failingRegistry.stop(true)
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}, 30_000)
