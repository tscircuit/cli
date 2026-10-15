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

for (const [
  name,
  standalone,
  generatedTsx,
  query = "AP2127K-2.8TRG1",
  options = "",
] of [
  ["standalone imports generated TSX without JLCSearch", "1", tsx],
  ["normal CLI skips the datasheet import lookup", undefined, tsx],
  ["disabled standalone skips the datasheet import lookup", "0", tsx],
  ["standalone rejects a part when generated TSX is null", "1", null],
  ["standalone rejects a part when generated TSX is empty", "1", ""],
  ["standalone rejects a missing datasheet", "1", undefined, "MISSING_PART"],
  ["standalone rejects an unbundled LCSC ID", "1", undefined, "C2040"],
  ...[
    "--jlcpcb",
    "--lcsc",
    "--tscircuit",
    "--download",
    "--use-exact-footprint",
    "--exclude-pin-attributes",
  ].map(
    (option) =>
      [
        `standalone rejects the network import path with ${option}`,
        "1",
        tsx,
        "C2040",
        option,
      ] as const,
  ),
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
          if (generatedTsx === undefined)
            return new Response(null, { status: 404 })
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
      `tsci import ${query} ${options}`.trim(),
    )
    const imported = standalone === "1" && Boolean(generatedTsx) && !options
    const unavailable = standalone === "1" && !imported
    expect(exitCode).toBe(unavailable ? 1 : 0)
    expect(stderr).toBe("")
    const expectedRequests =
      standalone === "1" && !options
        ? [
            `/datasheet-api/datasheets/get?chip_name=${query.replace(/[^0-9a-zA-Z_-]/g, "").toLowerCase()}`,
          ]
        : []
    if (standalone !== "1")
      expectedRequests.push("/jlcsearch/api/search?limit=10&q=AP2127K-2.8TRG1")
    expect(requests).toEqual(expectedRequests)
    const file = Bun.file(path.join(tmpDir, "imports/AP2127K_28TRG1.tsx"))
    expect(await file.exists()).toBe(imported)
    if (unavailable) {
      expect(stdout).toContain(
        "This part isn't currently available in tscircuit standalone (enterprise), please contact your representative to get it added",
      )
    }
    if (imported) {
      expect(await file.text()).toBe(tsx)
      expect(stdout).toContain("Imported")
    }
  }, 20_000)
}
