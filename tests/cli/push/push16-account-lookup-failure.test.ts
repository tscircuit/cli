import { expect, test } from "bun:test"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { resolve } from "node:path"
import { getCliConfig } from "lib/cli-config"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

/**
 * Regression tests for issue tscircuit/cli#5275:
 * `tsci push` with TSCIRCUIT_TOKEN must not report a missing tscircuit
 * handle when the account lookup itself fails (HTTP error, network
 * failure, malformed response).
 *
 * The CLI runs in a subprocess, so failures are injected through a
 * preload script that overrides globalThis.fetch for the subprocess:
 * every URL except /accounts/get returns 502 and /accounts/get answers
 * with the failure scenario under test.
 */

type FetchFailureKind = "http503" | "sessionExpired" | "malformedJson"

const failureScript: Record<FetchFailureKind, string> = {
  http503: `return new Response(
    JSON.stringify({
      error: {
        error_code: "service_unavailable",
        message: "Simulated registry outage",
      },
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  )`,
  sessionExpired: `return new Response(
    JSON.stringify({
      error: {
        error_code: "session_expired",
        message: "Session expired",
      },
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  )`,
  malformedJson: `return new Response("<html>not json</html>", {
    status: 200,
    headers: { "Content-Type": "text/html" },
  })`,
}

const preloadTs = (kind: FetchFailureKind) => `
const realFetch = globalThis.fetch
globalThis.fetch = (async (input, init) => {
  const url =
    typeof input === "string" || input instanceof URL
      ? String(input)
      : input.url
  if (new URL(url).pathname.endsWith("/accounts/get")) {
    ${failureScript[kind]}
  }
  return new Response(
    JSON.stringify({
      error: {
        error_code: "repro_fixture_blocked",
        message: "Test blocked unexpected network request: " + url,
      },
    }),
    { status: 502, headers: { "Content-Type": "application/json" } },
  )
}) as typeof fetch
`

type Fixture = Awaited<ReturnType<typeof getCliTestFixture>>

const enableEnvToken = (fixture: Fixture, useSavedHandle: boolean) => {
  const config = getCliConfig({
    configDir: path.join(fixture.tmpDir, ".config"),
  })
  const originalToken = process.env.TSCIRCUIT_TOKEN
  process.env.TSCIRCUIT_TOKEN = fixture.registryDb.accounts[0].account_id
  if (useSavedHandle) {
    config.set("tscircuitHandle", "test-user")
  } else {
    config.delete("tscircuitHandle")
    config.delete("accountId")
  }
  writeFileSync(
    path.join(fixture.tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )
  writeFileSync(path.join(fixture.tmpDir, "index.tsx"), "// snippet")
  // Bypass the fixture's runCommand env whitelist by exporting the token to
  // the CLI subprocess through the shared global config (cfg file), not env.
  return originalToken
}

const restoreToken = (originalToken: string | undefined) => {
  if (originalToken === undefined) {
    delete process.env.TSCIRCUIT_TOKEN
  } else {
    process.env.TSCIRCUIT_TOKEN = originalToken
  }
}

test("push reports HTTP 503 account lookup failure instead of missing handle", async () => {
  const fixture = await getCliTestFixture({ loggedIn: true })
  const originalToken = await enableEnvToken(fixture, false)

  const reproDir = path.join(fixture.tmpDir, ".repro")
  mkdirSync(reproDir, { recursive: true })
  const preloadPath = path.join(reproDir, "preload-503.ts")
  writeFileSync(preloadPath, preloadTs("http503"))

  const cliEntry = resolve(process.cwd(), "cli/main.ts")
  const env = {
    ...process.env,
    TSCI_TEST_MODE: "true",
    FORCE_COLOR: "0",
    NODE_ENV: "test",
    TSCIRCUIT_TOKEN: fixture.registryDb.accounts[0].account_id,
    TSCIRCUIT_CONFIG_DIR: path.join(fixture.tmpDir, ".config"),
  }

  const task = Bun.spawn(
    ["bun", "--preload", preloadPath, cliEntry, "push", "index.tsx"],
    {
      cwd: fixture.tmpDir,
      stdout: "pipe",
      stderr: "pipe",
      env,
    },
  )
  const stderr = await new Response(task.stderr).text()
  const exitCode = await task.exited

  restoreToken(originalToken)
  expect(exitCode).toBe(1)
  expect(stderr).toContain("Could not verify your account for publishing")
  expect(stderr).toContain("503")
  expect(stderr).not.toContain("You need to set your tscircuit handle")
}, 60_000)

test("push reports expired-session account lookup failure instead of missing handle", async () => {
  const fixture = await getCliTestFixture({ loggedIn: true })
  const originalToken = await enableEnvToken(fixture, false)

  const reproDir = path.join(fixture.tmpDir, ".repro")
  mkdirSync(reproDir, { recursive: true })
  const preloadPath = path.join(reproDir, "preload-expired.ts")
  writeFileSync(preloadPath, preloadTs("sessionExpired"))

  const cliEntry = resolve(process.cwd(), "cli/main.ts")
  const env = {
    ...process.env,
    TSCI_TEST_MODE: "true",
    FORCE_COLOR: "0",
    NODE_ENV: "test",
    TSCIRCUIT_TOKEN: fixture.registryDb.accounts[0].account_id,
    TSCIRCUIT_CONFIG_DIR: path.join(fixture.tmpDir, ".config"),
  }

  const task = Bun.spawn(
    ["bun", "--preload", preloadPath, cliEntry, "push", "index.tsx"],
    {
      cwd: fixture.tmpDir,
      stdout: "pipe",
      stderr: "pipe",
      env,
    },
  )
  const stderr = await new Response(task.stderr).text()
  const exitCode = await task.exited

  restoreToken(originalToken)
  expect(exitCode).toBe(1)
  expect(stderr).toContain("Could not verify your account for publishing")
  expect(stderr).toContain("session has expired")
  expect(stderr).not.toContain("You need to set your tscircuit handle")
}, 60_000)

test("push reports malformed lookup response instead of missing handle", async () => {
  const fixture = await getCliTestFixture({ loggedIn: true })
  const originalToken = await enableEnvToken(fixture, false)

  const reproDir = path.join(fixture.tmpDir, ".repro")
  mkdirSync(reproDir, { recursive: true })
  const preloadPath = path.join(reproDir, "preload-malformed.ts")
  writeFileSync(preloadPath, preloadTs("malformedJson"))

  const cliEntry = resolve(process.cwd(), "cli/main.ts")
  const env = {
    ...process.env,
    TSCI_TEST_MODE: "true",
    FORCE_COLOR: "0",
    NODE_ENV: "test",
    TSCIRCUIT_TOKEN: fixture.registryDb.accounts[0].account_id,
    TSCIRCUIT_CONFIG_DIR: path.join(fixture.tmpDir, ".config"),
  }

  const task = Bun.spawn(
    ["bun", "--preload", preloadPath, cliEntry, "push", "index.tsx"],
    {
      cwd: fixture.tmpDir,
      stdout: "pipe",
      stderr: "pipe",
      env,
    },
  )
  const stderr = await new Response(task.stderr).text()
  const exitCode = await task.exited

  restoreToken(originalToken)
  expect(exitCode).toBe(1)
  expect(stderr).toContain("Could not verify your account for publishing")
  expect(stderr).not.toContain("You need to set your tscircuit handle")
}, 60_000)

test("push still requests a handle when lookup succeeds but no handle is set", async () => {
  const fixture = await getCliTestFixture({ loggedIn: true })
  const originalToken = await enableEnvToken(fixture, false)

  // Real (unmodified) registry: /accounts/get succeeds but tscircuit_handle is empty
  fixture.registryDb.accounts[0].tscircuit_handle = ""

  try {
    const { stderr, exitCode } = await fixture.runCommand("tsci push")
    expect(exitCode).toBe(1)
    expect(stderr).toContain("You need to set your tscircuit handle")
    expect(stderr).not.toContain("Could not verify your account")
  } finally {
    restoreToken(originalToken)
  }
}, 40_000)

test("push succeeds with a valid lookup and a saved handle", async () => {
  const fixture = await getCliTestFixture({ loggedIn: true })
  const originalToken = await enableEnvToken(fixture, true)
  fixture.registryDb.accounts[0].tscircuit_handle = "test-user"

  try {
    const { stdout, stderr, exitCode } = await fixture.runCommand("tsci push")
    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
  } finally {
    restoreToken(originalToken)
  }
}, 40_000)
