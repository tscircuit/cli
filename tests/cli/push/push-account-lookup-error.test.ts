import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { cliConfig, getCliConfig } from "lib/cli-config"
import { fetchAccountResult } from "lib/registry-api/fetch-account"
import { pushSnippet } from "lib/shared/push-snippet"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const originalToken = process.env.TSCIRCUIT_TOKEN
const originalSkipFetch = process.env.TSCI_SKIP_ACCOUNT_FETCH
let originalConfig: typeof cliConfig.store
let workDirs: string[] = []

const createTempProjectDir = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "tsci-push-acct-"))
  workDirs.push(dir)
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.repro", version: "1.0.0" }),
  )
  writeFileSync(
    path.join(dir, "index.circuit.tsx"),
    "export default () => null\n",
  )
  return dir
}

beforeEach(() => {
  originalConfig = { ...cliConfig.store }
  Reflect.deleteProperty(process.env, "TSCIRCUIT_TOKEN")
  Reflect.deleteProperty(process.env, "TSCI_SKIP_ACCOUNT_FETCH")
  cliConfig.delete("sessionToken")
  cliConfig.delete("accountId")
  cliConfig.delete("tscircuitHandle")
})

afterEach(() => {
  if (originalToken === undefined) {
    Reflect.deleteProperty(process.env, "TSCIRCUIT_TOKEN")
  } else {
    process.env.TSCIRCUIT_TOKEN = originalToken
  }
  if (originalSkipFetch === undefined) {
    Reflect.deleteProperty(process.env, "TSCI_SKIP_ACCOUNT_FETCH")
  } else {
    process.env.TSCI_SKIP_ACCOUNT_FETCH = originalSkipFetch
  }
  cliConfig.store = originalConfig
  for (const dir of workDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
  workDirs = []
})

test("fetchAccountResult distinguishes HTTP errors, invalid responses, connection errors, skipped, and valid accounts", async () => {
  let handler: (req: Request) => Response = () => Response.json({})
  const server = Bun.serve({
    port: 0,
    fetch: (req) => handler(req),
  })
  cliConfig.set("registryApiUrl", server.url.toString())
  process.env.TSCIRCUIT_TOKEN = "env-token"

  try {
    for (const [status, body] of [
      [
        503,
        JSON.stringify({
          error: {
            error_code: "service_unavailable",
            message: "Simulated outage",
          },
        }),
      ],
      [
        401,
        JSON.stringify({
          error: {
            error_code: "session_expired",
            message: "Session expired",
          },
        }),
      ],
      [
        403,
        JSON.stringify({
          error: { error_code: "forbidden", message: "Access denied" },
        }),
      ],
      [
        429,
        JSON.stringify({
          error: { error_code: "rate_limited", message: "Too many requests" },
        }),
      ],
    ] as const) {
      handler = () =>
        new Response(body, {
          status,
          headers: { "Content-Type": "application/json" },
        })
      const result = await fetchAccountResult()
      expect(result.status).toBe("error")
      if (result.status === "error") {
        expect(result.message).toContain(String(status))
        if (status === 401) {
          expect(result.message).toContain("Your tscircuit session has expired")
        }
      }
    }

    handler = () =>
      new Response("{not-valid-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    const badJson = await fetchAccountResult()
    expect(badJson.status).toBe("error")

    handler = () => Response.json({})
    const missingAccount = await fetchAccountResult()
    expect(missingAccount.status).toBe("error")
    if (missingAccount.status === "error") {
      expect(missingAccount.message).toContain("without an account object")
    }

    handler = () =>
      Response.json({
        account: {
          account_id: "acc-1",
          tscircuit_handle: "env-user",
        },
      })
    const valid = await fetchAccountResult()
    expect(valid.status).toBe("ok")
    if (valid.status === "ok") {
      expect(valid.account.tscircuit_handle).toBe("env-user")
    }

    process.env.TSCI_SKIP_ACCOUNT_FETCH = "true"
    expect(await fetchAccountResult()).toEqual({ status: "skipped" })
    Reflect.deleteProperty(process.env, "TSCI_SKIP_ACCOUNT_FETCH")
  } finally {
    const deadUrl = server.url.toString()
    server.stop(true)
    cliConfig.set("registryApiUrl", deadUrl)
  }

  const networkError = await fetchAccountResult()
  expect(networkError.status).toBe("error")
})

test("pushSnippet surfaces lookup failure instead of missing handle, even with cached handle alongside TSCIRCUIT_TOKEN", async () => {
  const seenPaths: string[] = []
  let mode: "503" | "401" | "no_handle" = "503"
  const server = Bun.serve({
    port: 0,
    fetch: (req) => {
      seenPaths.push(new URL(req.url).pathname)
      if (mode === "503") {
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
      if (mode === "401") {
        return Response.json(
          {
            error: {
              error_code: "session_expired",
              message: "Expired token",
            },
          },
          { status: 401 },
        )
      }
      return Response.json({
        account: {
          account_id: "acc-no-handle",
          tscircuit_handle: null,
        },
      })
    },
  })

  const prevCwd = process.cwd()
  try {
    cliConfig.set("registryApiUrl", server.url.toString())
    cliConfig.set("tscircuitHandle", "cached-handle")
    cliConfig.set("accountId", "cached-account")
    process.env.TSCIRCUIT_TOKEN = "env-token"
    const dir = createTempProjectDir()
    process.chdir(dir)
    const filePath = path.join(dir, "index.circuit.tsx")

    const errors503: string[] = []
    let exit503: number | undefined
    await pushSnippet({
      filePath,
      onError: (msg) => errors503.push(msg),
      onExit: (code) => {
        exit503 = code
      },
      log: () => {},
    })
    expect(exit503).toBe(1)
    expect(seenPaths).toEqual(["/accounts/get"])
    expect(errors503.join("\n")).toContain(
      "Could not verify your account for publishing",
    )
    expect(errors503.join("\n")).toContain("503")
    expect(errors503.join("\n")).not.toContain(
      "You need to set your tscircuit handle to publish packages",
    )

    mode = "401"
    const errors401: string[] = []
    let exit401: number | undefined
    await pushSnippet({
      filePath,
      onError: (msg) => errors401.push(msg),
      onExit: (code) => {
        exit401 = code
      },
      log: () => {},
    })
    expect(exit401).toBe(1)
    expect(errors401.join("\n")).toContain("session_expired")
    expect(errors401.join("\n")).toContain("Your tscircuit session has expired")

    mode = "no_handle"
    const errorsNoHandle: string[] = []
    let exitNoHandle: number | undefined
    await pushSnippet({
      filePath,
      onError: (msg) => errorsNoHandle.push(msg),
      onExit: (code) => {
        exitNoHandle = code
      },
      log: () => {},
    })
    expect(exitNoHandle).toBe(1)
    expect(errorsNoHandle).toEqual([
      "You need to set your tscircuit handle to publish packages",
    ])
  } finally {
    process.chdir(prevCwd)
    server.stop(true)
  }
})

test("CLI push, auth whoami, and login report account lookup errors instead of @undefined or @(not set)", async () => {
  const requestedPaths: string[] = []
  const outageServer = Bun.serve({
    port: 0,
    fetch: (req) => {
      requestedPaths.push(new URL(req.url).pathname)
      return Response.json(
        {
          error: {
            error_code: "service_unavailable",
            message: "Simulated outage",
          },
        },
        { status: 503 },
      )
    },
  })

  const { tmpDir, runCommand } = await getCliTestFixture({
    env: { TSCIRCUIT_TOKEN: "placeholder-token" },
  })
  const config = getCliConfig({ configDir: path.join(tmpDir, ".config") })
  config.set("registryApiUrl", outageServer.url.toString())

  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.repro", version: "1.0.0" }),
  )
  writeFileSync(
    path.join(tmpDir, "index.circuit.tsx"),
    "export default () => null\n",
  )

  try {
    const pushRes = await runCommand("tsci push index.circuit.tsx")
    expect(pushRes.exitCode).toBe(1)
    expect(pushRes.stderr).toContain(
      "Could not verify your account for publishing",
    )
    expect(pushRes.stderr).toContain("503")
    expect(pushRes.stderr).not.toContain(
      "You need to set your tscircuit handle to publish packages",
    )
    expect(requestedPaths).toEqual(["/accounts/get"])

    const whoamiRes = await runCommand("tsci auth whoami")
    expect(whoamiRes.exitCode).toBe(1)
    expect(whoamiRes.stderr).toContain("503")
    expect(whoamiRes.stdout).not.toContain("@(not set)")

    const loginRes = await runCommand("tsci login")
    expect(loginRes.exitCode).toBe(1)
    expect(loginRes.stderr).toContain("503")
    expect(loginRes.stdout).not.toContain("@undefined")
  } finally {
    outageServer.stop(true)
  }
}, 30_000)

test("CLI login with TSCI_SKIP_ACCOUNT_FETCH=true does not display @undefined", async () => {
  const skipFixture = await getCliTestFixture({
    env: {
      TSCIRCUIT_TOKEN: "placeholder-token",
      TSCI_SKIP_ACCOUNT_FETCH: "true",
    },
  })
  const skipLogin = await skipFixture.runCommand("tsci login")
  expect(skipLogin.exitCode).toBe(0)
  expect(skipLogin.stdout).toContain("Already logged in")
  expect(skipLogin.stdout).not.toContain("@undefined")
}, 30_000)
