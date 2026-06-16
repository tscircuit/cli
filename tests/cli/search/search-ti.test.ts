import { expect, test } from "bun:test"
import { ULKiCadProxyServer } from "@tscircuit/fake-ul-kicad-proxy"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("search --ti returns Texas Instruments results", async () => {
  const fakeServer = new ULKiCadProxyServer()
  const handleFakeProxyRequest = fakeServer.handleRequest
  fakeServer.handleRequest = (request: Request) => {
    const headers = new Headers(request.headers)
    if (!headers.has("authorization")) {
      headers.set("authorization", "Bearer test-token")
    }

    return handleFakeProxyRequest(new Request(request.url, { headers }))
  }
  process.env.TSCIRCUIT_TI_API_BASE_URL = await fakeServer.start()

  try {
    const { runCommand } = await getCliTestFixture()
    const { stdout, stderr } = await runCommand("tsci search --ti LM358")

    expect(stderr).toBe("")
    expect(stdout).toContain("Texas Instruments")
    expect(stdout).toContain("LM358")
    expect(stdout).not.toContain("JLC search")
  } finally {
    await fakeServer.stop()
    delete process.env.TSCIRCUIT_TI_API_BASE_URL
  }
})
