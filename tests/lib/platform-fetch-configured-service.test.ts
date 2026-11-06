import { expect, test } from "bun:test"
import { getPlatformFetch } from "lib/shared/get-platform-fetch"

test("explicit service URLs preserve HTTP errors and do not exempt sibling paths from asset routing", async () => {
  const previous = {
    TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL:
      process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL,
    TSCIRCUIT_JLCSEARCH_BASE_URL: process.env.TSCIRCUIT_JLCSEARCH_BASE_URL,
  }
  const requested: string[] = []
  try {
    process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL = "http://127.0.0.1:1234"
    process.env.TSCIRCUIT_JLCSEARCH_BASE_URL = "http://127.0.0.1:5678/jlc"
    const transport = Object.assign(
      async (input: Parameters<typeof fetch>[0]) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        )
        requested.push(url.toString())
        return new Response(null, { status: url.port === "5678" ? 404 : 200 })
      },
      { preconnect: fetch.preconnect },
    ) as typeof fetch
    const platformFetch = getPlatformFetch(transport)
    expect(
      (await platformFetch("http://127.0.0.1:5678/jlc/api/search?q=missing"))
        .status,
    ).toBe(404)
    await platformFetch("http://127.0.0.1:5678/jlc-other/model.step")
    expect(requested).toEqual([
      "http://127.0.0.1:5678/jlc/api/search?q=missing",
      "http://127.0.0.1:1234/127.0.0.1/jlc-other/model.step",
    ])
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
