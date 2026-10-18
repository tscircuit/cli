import { expect, test } from "bun:test"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { getCliConfig } from "lib/cli-config"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("push reports registry error instead of missing handle when TSCIRCUIT_TOKEN account lookup fails with 503", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.set("tscircuitHandle", "cached-handle")

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        {
          error: {
            error_code: "service_unavailable",
            message: "Registry temporarily unavailable",
          },
        },
        { status: 503 },
      ),
  })
  config.set("registryApiUrl", server.url.toString())

  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = "environment-token"

  writeFileSync(path.join(tmpDir, "snippet.tsx"), "// Snippet content")
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand("tsci push")
    const combinedOutput = `${stdout}\n${stderr}`

    expect(exitCode).toBe(1)
    expect(combinedOutput).toContain(
      "Could not verify your account for publishing:",
    )
    expect(combinedOutput).toContain("FAIL [503]: POST /accounts/get")
    expect(combinedOutput).toContain(
      "service_unavailable: Registry temporarily unavailable",
    )
    expect(combinedOutput).toContain("Retry when the registry is available.")
    expect(combinedOutput).not.toContain(
      "You need to set your tscircuit handle to publish packages",
    )
  } finally {
    server.stop()
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}, 30_000)

test("push preserves expired-session guidance when TSCIRCUIT_TOKEN account lookup returns session_expired", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: false,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        {
          error: {
            error_code: "session_expired",
            message: "Session has expired",
          },
        },
        { status: 401 },
      ),
  })
  config.set("registryApiUrl", server.url.toString())

  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = "expired-env-token"

  writeFileSync(path.join(tmpDir, "snippet.tsx"), "// Snippet content")
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand("tsci push")
    const combinedOutput = `${stdout}\n${stderr}`

    expect(exitCode).toBe(1)
    expect(combinedOutput).toContain(
      "Could not verify your account for publishing:",
    )
    expect(combinedOutput).toContain("session_expired: Session has expired")
    expect(combinedOutput).toContain("Your tscircuit session has expired.")
    expect(combinedOutput).not.toContain(
      "You need to set your tscircuit handle to publish packages",
    )
  } finally {
    server.stop()
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}, 30_000)

test("push still reports missing handle when TSCIRCUIT_TOKEN account lookup succeeds with empty handle", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.delete("sessionToken")
  config.delete("tscircuitHandle")
  config.delete("accountId")
  registryDb.accounts[0].tscircuit_handle = ""

  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = registryDb.accounts[0].account_id

  writeFileSync(path.join(tmpDir, "snippet.tsx"), "// Snippet content")
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand("tsci push")
    const combinedOutput = `${stdout}\n${stderr}`

    expect(exitCode).toBe(1)
    expect(combinedOutput).toContain(
      "You need to set your tscircuit handle to publish packages",
    )
  } finally {
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}, 30_000)

test("auth whoami and login fail with exit code 1 when account lookup fails instead of printing @(not set) or @undefined", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.set("tscircuitHandle", "cached-handle")

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        {
          error: {
            error_code: "internal_server_error",
            message: "Upstream error",
          },
        },
        { status: 500 },
      ),
  })
  config.set("registryApiUrl", server.url.toString())

  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = "environment-token"

  try {
    const whoamiResult = await runCommand("tsci auth whoami")
    expect(whoamiResult.exitCode).toBe(1)
    expect(`${whoamiResult.stdout}\n${whoamiResult.stderr}`).toContain(
      "Could not verify your account:",
    )
    expect(`${whoamiResult.stdout}\n${whoamiResult.stderr}`).not.toContain(
      "(not set)",
    )

    const loginResult = await runCommand("tsci login")
    expect(loginResult.exitCode).toBe(1)
    expect(`${loginResult.stdout}\n${loginResult.stderr}`).toContain(
      "Could not verify your account:",
    )
    expect(`${loginResult.stdout}\n${loginResult.stderr}`).not.toContain(
      "@undefined",
    )
  } finally {
    server.stop()
    if (originalToken === undefined) {
      delete process.env.TSCIRCUIT_TOKEN
    } else {
      process.env.TSCIRCUIT_TOKEN = originalToken
    }
  }
}, 30_000)
