import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { Command } from "commander"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { registerAuthPrintToken } from "cli/auth/print-token/register"
import { cliConfig, getSessionToken } from "lib/cli-config"
import { fetchAccount } from "lib/registry-api/fetch-account"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import { pushSnippet } from "lib/shared/push-snippet"

const originalToken = process.env.TSCIRCUIT_TOKEN
let originalConfig: typeof cliConfig.store

beforeEach(() => {
  originalConfig = cliConfig.store
  delete process.env.TSCIRCUIT_TOKEN
  cliConfig.delete("sessionToken")
})

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.TSCIRCUIT_TOKEN
  } else {
    process.env.TSCIRCUIT_TOKEN = originalToken
  }
  cliConfig.store = originalConfig
})

test("uses TSCIRCUIT_TOKEN without saving it to CLI configuration", () => {
  process.env.TSCIRCUIT_TOKEN = "environment-token"

  expect(getSessionToken()).toBe("environment-token")
  expect(cliConfig.get("sessionToken")).toBeUndefined()
})

test("TSCIRCUIT_TOKEN overrides the saved token", () => {
  cliConfig.set("sessionToken", "saved-token")
  process.env.TSCIRCUIT_TOKEN = "environment-token"

  expect(getSessionToken()).toBe("environment-token")
  expect(cliConfig.get("sessionToken")).toBe("saved-token")
})

test("uses the saved token when TSCIRCUIT_TOKEN is unset or empty", () => {
  cliConfig.set("sessionToken", "saved-token")

  expect(getSessionToken()).toBe("saved-token")
  process.env.TSCIRCUIT_TOKEN = ""
  expect(getSessionToken()).toBe("saved-token")
})

test("returns undefined when neither token is available", () => {
  expect(getSessionToken()).toBeUndefined()
  process.env.TSCIRCUIT_TOKEN = ""
  expect(getSessionToken()).toBeUndefined()
})

test("auth print-token prints the environment token", async () => {
  cliConfig.set("sessionToken", "saved-token")
  process.env.TSCIRCUIT_TOKEN = "environment-token"
  const program = new Command()
  program.command("auth")
  registerAuthPrintToken(program)
  const log = spyOn(console, "log").mockImplementation(() => {})

  try {
    await program.parseAsync(["auth", "print-token"], { from: "user" })
    expect(log).toHaveBeenCalledWith("Your Token:\n", "environment-token")
  } finally {
    log.mockRestore()
  }
})

test("registry requests use the environment token unless a token is explicitly supplied", async () => {
  process.env.TSCIRCUIT_TOKEN = "environment-token"
  cliConfig.set("sessionToken", "saved-token")
  const server = Bun.serve({
    port: 0,
    fetch: (request) => Response.json(request.headers.get("Authorization")),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  try {
    expect(await getRegistryApiKy().get("test").json<string>()).toBe(
      "Bearer environment-token",
    )
    expect(
      await getRegistryApiKy({ sessionToken: "explicit-token" })
        .get("test")
        .json<string>(),
    ).toBe("Bearer explicit-token")
  } finally {
    server.stop()
  }
})

test("fetchAccount uses the environment token's account instead of the saved account ID", async () => {
  process.env.TSCIRCUIT_TOKEN = "environment-token"
  cliConfig.set("accountId", "saved-account")
  const server = Bun.serve({
    port: 0,
    fetch: async (request) => {
      expect(request.headers.get("Authorization")).toBe(
        "Bearer environment-token",
      )
      expect(await request.json()).toEqual({})
      return Response.json({
        account: { account_id: "environment-account" },
      })
    },
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  try {
    expect((await fetchAccount())?.account_id).toBe("environment-account")
  } finally {
    server.stop()
  }
})

test("pushSnippet reports account lookup failure instead of missing handle when TSCIRCUIT_TOKEN lookup fails", async () => {
  process.env.TSCIRCUIT_TOKEN = "environment-token"
  cliConfig.set("tscircuitHandle", "cached-handle")

  let statusToReturn = 503
  let bodyToReturn = JSON.stringify({
    error: {
      error_code: "service_unavailable",
      message: "Simulated outage",
    },
  })

  const server = Bun.serve({
    port: 0,
    fetch: () =>
      new Response(bodyToReturn, {
        status: statusToReturn,
        headers: { "Content-Type": "application/json" },
      }),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-push-token-"))
  const snippetPath = path.join(tmpDir, "index.circuit.tsx")
  fs.writeFileSync(snippetPath, "export default () => null\n")
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.board", version: "0.0.1" }),
  )

  try {
    const errors503: string[] = []
    let exitCode503: number | undefined
    await pushSnippet({
      filePath: snippetPath,
      onError: (msg) => errors503.push(msg),
      onExit: (code) => {
        exitCode503 = code
      },
    })
    expect(exitCode503).toBe(1)
    expect(errors503.join("\n")).toContain(
      "Could not verify your account for publishing",
    )
    expect(errors503.join("\n")).toContain("503")
    expect(errors503.join("\n")).not.toContain(
      "You need to set your tscircuit handle",
    )

    // Genuine missing handle (HTTP 200 with account lacking tscircuit_handle)
    statusToReturn = 200
    bodyToReturn = JSON.stringify({
      account: {
        account_id: "acc_1",
        tscircuit_handle: null,
      },
    })
    const errorsMissingHandle: string[] = []
    let exitCodeMissingHandle: number | undefined
    await pushSnippet({
      filePath: snippetPath,
      onError: (msg) => errorsMissingHandle.push(msg),
      onExit: (code) => {
        exitCodeMissingHandle = code
      },
    })
    expect(exitCodeMissingHandle).toBe(1)
    expect(errorsMissingHandle).toEqual([
      "You need to set your tscircuit handle to publish packages",
    ])
  } finally {
    server.stop()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
