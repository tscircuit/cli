import { expect, test } from "bun:test"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("standalone import reports an unavailable part without searching online", async () => {
  const { runCommand } = await getCliTestFixture()
  const requests: string[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      requests.push(new URL(request.url).pathname)
      return Response.json({ components: [] }, { status: 404 })
    },
  })
  const previous = {
    TSCIRCUIT_STANDALONE: process.env.TSCIRCUIT_STANDALONE,
    TSCIRCUIT_DATASHEET_API_BASE_URL:
      process.env.TSCIRCUIT_DATASHEET_API_BASE_URL,
    TSCIRCUIT_JLCSEARCH_BASE_URL: process.env.TSCIRCUIT_JLCSEARCH_BASE_URL,
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

  const { stdout, exitCode } = await runCommand("tsci import MISSING_PART")

  expect(exitCode).toBe(1)
  expect(stdout).toContain(
    "This part isn't currently available in tscircuit standalone (enterprise), please contact your representative to get it added",
  )
  expect(requests).toEqual(["/datasheet-api/datasheets/get"])
}, 20_000)
