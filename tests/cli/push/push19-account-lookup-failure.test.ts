import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { cliConfig, getCliConfig } from "lib/cli-config"
import { pushSnippet } from "lib/shared/push-snippet"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const MISSING_HANDLE_MESSAGE =
  "You need to set your tscircuit handle to publish packages"

const originalToken = process.env.TSCIRCUIT_TOKEN
const originalSkipFetch = process.env.TSCI_SKIP_ACCOUNT_FETCH
let originalStore: typeof cliConfig.store
let tempDirs: string[] = []

beforeEach(() => {
  originalStore = { ...cliConfig.store }
  delete process.env.TSCIRCUIT_TOKEN
  delete process.env.TSCI_SKIP_ACCOUNT_FETCH
})

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.TSCIRCUIT_TOKEN
  } else {
    process.env.TSCIRCUIT_TOKEN = originalToken
  }
  if (originalSkipFetch === undefined) {
    delete process.env.TSCI_SKIP_ACCOUNT_FETCH
  } else {
    process.env.TSCI_SKIP_ACCOUNT_FETCH = originalSkipFetch
  }
  cliConfig.store = originalStore
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
  tempDirs = []
})

const createProjectFiles = (dir: string) => {
  const packageJsonPath = path.join(dir, "package.json")
  const packageJsonContent = JSON.stringify({
    name: "@tsci/test-user.test-package",
    version: "1.0.0",
  })
  writeFileSync(packageJsonPath, packageJsonContent)
  const circuitPath = path.join(dir, "index.circuit.tsx")
  writeFileSync(circuitPath, "export default () => null\n")
  return { packageJsonPath, packageJsonContent, circuitPath }
}

const runPushSnippetScenario = async (
  fetchHandler: (request: Request) => Response | Promise<Response>,
) => {
  const originalCwd = process.cwd()
  const projectDir = mkdtempSync(path.join(tmpdir(), "tsci-push-acct-"))
  tempDirs.push(projectDir)
  const { packageJsonPath, packageJsonContent } = createProjectFiles(projectDir)

  const requests: string[] = []
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      requests.push(`${request.method} ${new URL(request.url).pathname}`)
      return fetchHandler(request)
    },
  })

  process.env.TSCIRCUIT_TOKEN = "environment-token"
  cliConfig.set("tscircuitHandle", "cached-handle")
  cliConfig.set("registryApiUrl", server.url.toString())

  const errors: string[] = []
  let exitCode: number | undefined

  try {
    process.chdir(projectDir)
    await pushSnippet({
      filePath: "index.circuit.tsx",
      onError: (msg) => errors.push(msg),
      onExit: (code) => {
        exitCode = code
      },
      onSuccess: () => {},
      log: () => {},
    })
  } finally {
    process.chdir(originalCwd)
    server.stop()
  }

  expect(readFileSync(packageJsonPath, "utf8")).toBe(packageJsonContent)
  return { errors, exitCode, requests }
}

test("push CLI reports HTTP 503 account lookup failure instead of missing handle even when cached handle exists", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
    env: { TSCIRCUIT_TOKEN: "environment-token" },
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.set("tscircuitHandle", "cached-handle")

  const requests: string[] = []
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const pathname = new URL(request.url).pathname
      requests.push(`${request.method} ${pathname}`)
      if (pathname === "/accounts/get") {
        return Response.json(
          {
            error: {
              error_code: "service_unavailable",
              message: "Simulated outage",
            },
          },
          { status: 503 },
        )
      }
      return new Response("Unexpected request", { status: 500 })
    },
  })
  config.set("registryApiUrl", server.url.toString())

  const { packageJsonPath, packageJsonContent } = createProjectFiles(tmpDir)

  try {
    const { stdout, stderr, exitCode } = await runCommand(
      "tsci push index.circuit.tsx",
    )

    expect(exitCode).toBe(1)
    expect(stdout).toBe("")
    expect(stderr).toContain("Could not verify your account for publishing:")
    expect(stderr).toContain("503")
    expect(stderr).toContain("service_unavailable")
    expect(stderr).not.toContain(MISSING_HANDLE_MESSAGE)
    expect(requests).toEqual(["POST /accounts/get"])
    expect(readFileSync(packageJsonPath, "utf8")).toBe(packageJsonContent)
  } finally {
    server.stop()
  }
}, 30_000)

test("push CLI still reports missing handle when account lookup succeeds without a handle", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
    env: { TSCIRCUIT_TOKEN: "environment-token" },
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.delete("sessionToken")
  config.delete("tscircuitHandle")
  config.delete("accountId")

  const requests: string[] = []
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const pathname = new URL(request.url).pathname
      requests.push(`${request.method} ${pathname}`)
      if (pathname === "/accounts/get") {
        return Response.json({
          account: { account_id: "test-account", tscircuit_handle: null },
        })
      }
      return new Response("Unexpected request", { status: 500 })
    },
  })
  config.set("registryApiUrl", server.url.toString())

  const { packageJsonPath, packageJsonContent } = createProjectFiles(tmpDir)

  try {
    const { stderr, exitCode } = await runCommand("tsci push index.circuit.tsx")

    expect(exitCode).toBe(1)
    expect(stderr.trim()).toBe(MISSING_HANDLE_MESSAGE)
    expect(stderr).not.toContain("Could not verify your account for publishing")
    expect(requests).toEqual(["POST /accounts/get"])
    expect(readFileSync(packageJsonPath, "utf8")).toBe(packageJsonContent)
  } finally {
    server.stop()
  }
}, 30_000)

test("pushSnippet preserves expired-session guidance and status on HTTP 401", async () => {
  const { errors, exitCode, requests } = await runPushSnippetScenario(() =>
    Response.json(
      {
        error: {
          error_code: "session_expired",
          message: "Session expired",
        },
      },
      { status: 401 },
    ),
  )

  expect(exitCode).toBe(1)
  expect(requests).toEqual(["POST /accounts/get"])
  expect(errors[0]).toContain("Could not verify your account for publishing:")
  expect(errors[0]).toContain("401")
  expect(errors[0]).toContain("Your tscircuit session has expired")
  expect(errors[0]).not.toContain(MISSING_HANDLE_MESSAGE)
})

test("pushSnippet reports network failures instead of missing handle", async () => {
  const originalCwd = process.cwd()
  const projectDir = mkdtempSync(path.join(tmpdir(), "tsci-push-net-"))
  tempDirs.push(projectDir)
  createProjectFiles(projectDir)

  const server = Bun.serve({
    port: 0,
    fetch: () => new Response("ok"),
  })
  const closedUrl = server.url.toString()
  server.stop(true)

  process.env.TSCIRCUIT_TOKEN = "environment-token"
  cliConfig.set("tscircuitHandle", "cached-handle")
  cliConfig.set("registryApiUrl", closedUrl)

  const errors: string[] = []
  let exitCode: number | undefined

  try {
    process.chdir(projectDir)
    await pushSnippet({
      filePath: "index.circuit.tsx",
      onError: (msg) => errors.push(msg),
      onExit: (code) => {
        exitCode = code
      },
      onSuccess: () => {},
      log: () => {},
    })
  } finally {
    process.chdir(originalCwd)
  }

  expect(exitCode).toBe(1)
  expect(errors[0]).toContain("Could not verify your account for publishing:")
  expect(errors[0]).not.toContain(MISSING_HANDLE_MESSAGE)
})

test("pushSnippet rejects malformed JSON and missing account payloads on HTTP 200", async () => {
  const malformed = await runPushSnippetScenario(
    () =>
      new Response("<html>not json</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
  )
  expect(malformed.exitCode).toBe(1)
  expect(malformed.errors[0]).toContain(
    "Could not verify your account for publishing:",
  )
  expect(malformed.errors[0]).not.toContain(MISSING_HANDLE_MESSAGE)

  const missingAccount = await runPushSnippetScenario(() => Response.json({}))
  expect(missingAccount.exitCode).toBe(1)
  expect(missingAccount.errors[0]).toContain(
    "Could not verify your account for publishing: Invalid account response from registry",
  )
  expect(missingAccount.errors[0]).not.toContain(MISSING_HANDLE_MESSAGE)
})

test("auth whoami and login fail with nonzero exit code on account lookup failure", async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        {
          error: {
            error_code: "service_unavailable",
            message: "Simulated outage",
          },
        },
        { status: 503 },
      ),
  })

  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
    env: { TSCIRCUIT_TOKEN: "environment-token" },
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.set("registryApiUrl", server.url.toString())

  try {
    const whoamiResult = await runCommand("tsci auth whoami")
    expect(whoamiResult.exitCode).toBe(1)
    expect(whoamiResult.stderr).toContain("Could not verify your account:")
    expect(whoamiResult.stderr).toContain("503")
    expect(whoamiResult.stdout).not.toContain("Logged in user:")
    expect(whoamiResult.stdout).not.toContain("@(not set)")

    const loginResult = await runCommand("tsci login")
    expect(loginResult.exitCode).toBe(1)
    expect(loginResult.stderr).toContain("Could not verify your account:")
    expect(loginResult.stderr).toContain("503")
    expect(loginResult.stdout).not.toContain("Already logged in")
    expect(loginResult.stdout).not.toContain("@undefined")
  } finally {
    server.stop()
  }
}, 30_000)
