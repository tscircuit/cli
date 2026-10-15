import { afterEach, expect, test } from "bun:test"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import regulator from "tests/fixtures/assets/datasheets/AP2127K-2.8TRG1.datasheet.json"

const environmentVariables = [
  "TSCIRCUIT_STANDALONE",
  "TSCIRCUIT_DATASHEET_API_BASE_URL",
  "TSCIRCUIT_JLCSEARCH_BASE_URL",
] as const
const originalEnvironment = environmentVariables.map(
  (name) => process.env[name],
)

afterEach(() => {
  environmentVariables.forEach((name, index) => {
    if (originalEnvironment[index] === undefined) delete process.env[name]
    else process.env[name] = originalEnvironment[index]
  })
})

const tsx = `export const AP2127K_28TRG1 = () => <chip
  footprint="sot25"
  pinAttributes={{ pin5: { providesVoltage: 2.8 } }}
/>
`

for (const [name, standalone, generatedTsx] of [
  ["standalone imports generated TSX without JLCSearch", "1", tsx],
  ["normal CLI skips the datasheet import lookup", undefined, tsx],
  ["disabled standalone skips the datasheet import lookup", "0", tsx],
] as const) {
  test(name, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const requests: string[] = []
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        const url = new URL(request.url)
        requests.push(url.pathname + url.search)
        if (url.pathname === "/datasheet-api/datasheets/get") {
          return Response.json({
            datasheet: { ...regulator.datasheet, generated_tsx: generatedTsx },
          })
        }
        return Response.json({ components: [] })
      },
    })
    globalThis.deferredCleanupFns.push(async () => {
      await server.stop(true)
    })
    if (standalone === undefined) delete process.env.TSCIRCUIT_STANDALONE
    else process.env.TSCIRCUIT_STANDALONE = standalone
    process.env.TSCIRCUIT_DATASHEET_API_BASE_URL = `${server.url}datasheet-api/`
    process.env.TSCIRCUIT_JLCSEARCH_BASE_URL = `${server.url}jlcsearch`

    const { stdout, stderr, exitCode } = await runCommand(
      "tsci import AP2127K-2.8TRG1",
    )
    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    const expectedRequests =
      standalone === "1"
        ? ["/datasheet-api/datasheets/get?chip_name=ap2127k-28trg1"]
        : []
    const imported = standalone === "1" && Boolean(generatedTsx)
    if (!imported)
      expectedRequests.push("/jlcsearch/api/search?limit=10&q=AP2127K-2.8TRG1")
    expect(requests).toEqual(expectedRequests)
    const file = Bun.file(path.join(tmpDir, "imports/AP2127K_28TRG1.tsx"))
    expect(await file.exists()).toBe(imported)
    if (imported) {
      expect(await file.text()).toBe(tsx)
      expect(stdout).toContain("Imported")
    }
  }, 20_000)
}
