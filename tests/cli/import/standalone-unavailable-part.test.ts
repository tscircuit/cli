import { expect, test } from "bun:test"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("standalone import routes the EasyEDA fallback to the baked asset server", async () => {
  const { runCommand } = await getCliTestFixture()
  const requests: string[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      requests.push(`${request.method} ${url.pathname}`)
      if (url.pathname === "/jlcsearch/api/search")
        return Response.json({ components: [] })
      return Response.json({ components: [] }, { status: 404 })
    },
  })
  const previous = {
    TSCIRCUIT_STANDALONE: process.env.TSCIRCUIT_STANDALONE,
    TSCIRCUIT_DATASHEET_API_BASE_URL:
      process.env.TSCIRCUIT_DATASHEET_API_BASE_URL,
    TSCIRCUIT_JLCSEARCH_BASE_URL: process.env.TSCIRCUIT_JLCSEARCH_BASE_URL,
    TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL:
      process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL,
  }
  globalThis.deferredCleanupFns.push(async () => {
    server.stop(true)
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })
  process.env.TSCIRCUIT_STANDALONE = "1"
  process.env.TSCIRCUIT_DATASHEET_API_BASE_URL = `${server.url}datasheet-api`
  process.env.TSCIRCUIT_JLCSEARCH_BASE_URL = `${server.url}jlcsearch`
  process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL = server.url.toString()

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci import C999999999999",
  )

  expect(exitCode).toBe(1)
  expect(stdout + stderr).toContain(
    "This part isn't currently available in tscircuit standalone (enterprise), please contact your representative to get it added",
  )
  expect(requests).toEqual([
    "GET /datasheet-api/datasheets/get",
    "GET /jlcsearch/api/search",
    "POST /easyeda.com/api/components/search",
  ])
}, 20_000)
