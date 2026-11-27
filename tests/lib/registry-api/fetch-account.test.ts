import { afterEach, beforeEach, expect, test } from "bun:test"
import { cliConfig } from "lib/cli-config"
import {
  AccountLookupError,
  fetchAccount,
  formatAccountLookupError,
} from "lib/registry-api/fetch-account"

const originalToken = process.env.TSCIRCUIT_TOKEN
const originalSkip = process.env.TSCI_SKIP_ACCOUNT_FETCH
const originalFetch = globalThis.fetch
let originalConfig: typeof cliConfig.store

beforeEach(() => {
  originalConfig = { ...cliConfig.store }
  delete process.env.TSCIRCUIT_TOKEN
  delete process.env.TSCI_SKIP_ACCOUNT_FETCH
  cliConfig.clear()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalToken === undefined) {
    delete process.env.TSCIRCUIT_TOKEN
  } else {
    process.env.TSCIRCUIT_TOKEN = originalToken
  }
  if (originalSkip === undefined) {
    delete process.env.TSCI_SKIP_ACCOUNT_FETCH
  } else {
    process.env.TSCI_SKIP_ACCOUNT_FETCH = originalSkip
  }
  cliConfig.store = originalConfig
})

test("fetchAccount returns null when unauthenticated or skipped", async () => {
  expect(await fetchAccount()).toBeNull()

  process.env.TSCIRCUIT_TOKEN = "placeholder-token"
  process.env.TSCI_SKIP_ACCOUNT_FETCH = "true"
  expect(await fetchAccount()).toBeNull()
})

test("fetchAccount returns account including when tscircuit_handle is unset", async () => {
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"
  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json({
        account: {
          account_id: "acct-no-handle",
          tscircuit_handle: null,
        },
      }),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  try {
    const account = await fetchAccount()
    expect(account?.account_id).toBe("acct-no-handle")
    expect(account?.tscircuit_handle).toBeNull()
  } finally {
    server.stop()
  }
})

test("fetchAccount throws AccountLookupError with HTTP 503 status and retry hint", async () => {
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"
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
  cliConfig.set("registryApiUrl", server.url.toString())

  try {
    let caught: unknown
    try {
      await fetchAccount()
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AccountLookupError)
    const lookupError = caught as AccountLookupError
    expect(lookupError.status).toBe(503)
    expect(lookupError.message).toContain("HTTP 503")
    expect(lookupError.message).toContain("service_unavailable")

    const formatted = formatAccountLookupError(
      "Could not verify your account for publishing",
      caught,
    )
    expect(formatted).toContain("Could not verify your account for publishing")
    expect(formatted).toContain("HTTP 503")
    expect(formatted).toContain("Retry when the registry is available.")
  } finally {
    server.stop()
  }
})

test("fetchAccount preserves session_expired guidance on HTTP 401", async () => {
  process.env.TSCIRCUIT_TOKEN = "expired-token"
  const server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json(
        {
          error: {
            error_code: "session_expired",
            message: "Session expired",
          },
        },
        { status: 401 },
      ),
  })
  cliConfig.set("registryApiUrl", server.url.toString())

  try {
    let caught: unknown
    try {
      await fetchAccount()
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AccountLookupError)
    const lookupError = caught as AccountLookupError
    expect(lookupError.status).toBe(401)
    expect(lookupError.message).toContain("Your tscircuit session has expired")
    expect(lookupError.message).toContain("tsci logout")
    expect(lookupError.message).toContain("tsci login")
  } finally {
    server.stop()
  }
})

test("fetchAccount throws AccountLookupError on HTTP 403 and HTTP 429", async () => {
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"

  for (const status of [403, 429]) {
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        Response.json(
          { error: { error_code: `err_${status}`, message: `HTTP ${status}` } },
          { status },
        ),
    })
    cliConfig.set("registryApiUrl", server.url.toString())

    try {
      let caught: unknown
      try {
        await fetchAccount()
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(AccountLookupError)
      expect((caught as AccountLookupError).status).toBe(status)
      const formatted = formatAccountLookupError("Lookup failed", caught)
      expect(formatted).toContain(`HTTP ${status}`)
      if (status === 429) {
        expect(formatted).toContain("Retry when the registry is available.")
      }
    } finally {
      server.stop()
    }
  }
})

test("fetchAccount throws AccountLookupError on network and timeout errors", async () => {
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"
  cliConfig.set("registryApiUrl", "http://127.0.0.1:1")

  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed", {
      cause: new Error("ECONNREFUSED 127.0.0.1:1"),
    })
  }) as unknown as typeof fetch

  let networkErr: unknown
  try {
    await fetchAccount()
  } catch (error) {
    networkErr = error
  }
  expect(networkErr).toBeInstanceOf(AccountLookupError)
  expect((networkErr as AccountLookupError).message).toContain("fetch failed")
  expect((networkErr as AccountLookupError).message).toContain("ECONNREFUSED")
  expect((networkErr as AccountLookupError).cause).toBeInstanceOf(TypeError)

  globalThis.fetch = (async () => {
    const timeoutErr = new Error("The operation timed out")
    timeoutErr.name = "TimeoutError"
    throw timeoutErr
  }) as unknown as typeof fetch

  let timeoutErr: unknown
  try {
    await fetchAccount()
  } catch (error) {
    timeoutErr = error
  }
  expect(timeoutErr).toBeInstanceOf(AccountLookupError)
  expect((timeoutErr as AccountLookupError).message).toContain("timed out")
})

test("fetchAccount throws AccountLookupError on malformed JSON or missing account object", async () => {
  process.env.TSCIRCUIT_TOKEN = "placeholder-token"

  const malformedServer = Bun.serve({
    port: 0,
    fetch: () =>
      new Response("{not-valid-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  })
  cliConfig.set("registryApiUrl", malformedServer.url.toString())

  try {
    let caught: unknown
    try {
      await fetchAccount()
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(AccountLookupError)
    expect((caught as AccountLookupError).message).toContain("malformed JSON")
  } finally {
    malformedServer.stop()
  }

  for (const body of [
    {},
    { account: null },
    { account: [] },
    [],
    "unexpected",
  ]) {
    const missingAccountServer = Bun.serve({
      port: 0,
      fetch: () => Response.json(body),
    })
    cliConfig.set("registryApiUrl", missingAccountServer.url.toString())

    try {
      let caught: unknown
      try {
        await fetchAccount()
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(AccountLookupError)
      expect((caught as AccountLookupError).message).toContain(
        "missing account object",
      )
    } finally {
      missingAccountServer.stop()
    }
  }
})
