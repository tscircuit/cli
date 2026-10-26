import { afterEach, expect, mock, test } from "bun:test"
import { type Account, fetchAccount } from "lib/registry-api/fetch-account"

const originalFetch = globalThis.fetch
const originalSkipAccountFetch = process.env.TSCI_SKIP_ACCOUNT_FETCH
const originalToken = process.env.TSCIRCUIT_TOKEN

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalSkipAccountFetch === undefined) {
    delete process.env.TSCI_SKIP_ACCOUNT_FETCH
  } else {
    process.env.TSCI_SKIP_ACCOUNT_FETCH = originalSkipAccountFetch
  }
  if (originalToken === undefined) delete process.env.TSCIRCUIT_TOKEN
  else process.env.TSCIRCUIT_TOKEN = originalToken
})

test("TSCI_SKIP_ACCOUNT_FETCH skips the request even with a session token", async () => {
  process.env.TSCI_SKIP_ACCOUNT_FETCH = "true"
  process.env.TSCIRCUIT_TOKEN = "test-session-token"
  const fetchSpy = mock(() => {
    throw new Error("Network access is forbidden")
  })
  globalThis.fetch = Object.assign(fetchSpy, {
    preconnect: originalFetch.preconnect,
  }) as typeof fetch

  expect(await fetchAccount()).toBeNull()
  expect(fetchSpy).not.toHaveBeenCalled()
})

test.each([undefined, "false"])(
  "account lookup retains its default behavior when the skip flag is %s",
  async (value) => {
    if (value === undefined) delete process.env.TSCI_SKIP_ACCOUNT_FETCH
    else process.env.TSCI_SKIP_ACCOUNT_FETCH = value
    process.env.TSCIRCUIT_TOKEN = "test-session-token"
    const account: Account = {
      account_id: "00000000-0000-4000-8000-000000000001",
      github_username: null,
      tscircuit_handle: "test-account",
      personal_org_id: "00000000-0000-4000-8000-000000000002",
      created_at: "2026-10-26T00:00:00.000Z",
      email: "test@example.com",
    }
    const fetchSpy = mock(async () => Response.json({ account }))
    globalThis.fetch = Object.assign(fetchSpy, {
      preconnect: originalFetch.preconnect,
    }) as typeof fetch

    expect(await fetchAccount()).toEqual(account)
    expect(fetchSpy).toHaveBeenCalled()
  },
)
