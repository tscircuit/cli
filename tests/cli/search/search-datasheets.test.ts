import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { registerSearch } from "cli/search/register"
import { Command } from "commander"
import { getRegistryApiUrl } from "lib/cli-config"

const environmentVariables = [
  "TSCIRCUIT_DEFAULT_SEARCH_SOURCE",
  "TSCIRCUIT_DATASHEET_API_BASE_URL",
  "TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL",
] as const
let restore: Array<() => void> = []
beforeEach(() => {
  for (const variable of environmentVariables) {
    const original = process.env[variable]
    restore.push(() => {
      if (original === undefined) delete process.env[variable]
      else process.env[variable] = original
    })
  }
  Reflect.deleteProperty(process.env, "TSCIRCUIT_DEFAULT_SEARCH_SOURCE")
  Reflect.deleteProperty(process.env, "TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL")
  process.env.TSCIRCUIT_DATASHEET_API_BASE_URL =
    "https://parts.example/mirror/datasheet-api/"
})
afterEach(() => {
  for (const cleanup of restore.reverse()) cleanup()
  restore = []
})

const part = (chip_name: string) => ({
  datasheet_id: `datasheet-${chip_name}`,
  chip_name,
})
const inventory = [part("RP2350"), part("RP2040"), part("NE555DR")]
const run = async (
  args: string[],
  respond: (url: URL) => Response = () =>
    Response.json({ datasheets: inventory }),
) => {
  const fetcher = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (input: Parameters<typeof fetch>[0]) =>
        respond(new URL(input instanceof Request ? input.url : String(input))),
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  const log = spyOn(console, "log").mockImplementation(() => {})
  const error = spyOn(console, "error").mockImplementation(() => {})
  restore.push(
    () => fetcher.mockRestore(),
    () => log.mockRestore(),
    () => error.mockRestore(),
  )
  const program = new Command()
  registerSearch(program)
  await program.parseAsync(["search", ...args], { from: "user" })
  return { fetcher, log, error }
}
const json = (log: ReturnType<typeof spyOn>) =>
  JSON.parse(String(log.mock.calls[0][0]))

test("--datasheets searches the inventory once through its configured base URL", async () => {
  const { fetcher, log } = await run(["--datasheets", "--json", "rP204"])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0]).toEqual([
    "https://parts.example/mirror/datasheet-api/datasheets/list",
    {
      headers: { accept: "application/json" },
      signal: expect.any(AbortSignal),
    },
  ])
  expect(json(log)).toEqual({
    query: "rP204",
    results: [{ source: "datasheets", ...part("RP2040") }],
  })
})

test("datasheets use the registry API by default", async () => {
  Reflect.deleteProperty(process.env, "TSCIRCUIT_DATASHEET_API_BASE_URL")
  const { fetcher } = await run(["--datasheets", "RP2040"])
  expect(fetcher.mock.calls[0][0]).toBe(
    `${getRegistryApiUrl().replace(/\/+$/, "")}/datasheets/list`,
  )
})

test("datasheet search preserves local mirror paths through platform fetch", async () => {
  process.env.TSCIRCUIT_DATASHEET_API_BASE_URL =
    "http://127.0.0.1:12345/datasheet-api/"
  process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL = "http://127.0.0.1:12345"
  const { fetcher, log } = await run(["--datasheets", "--json", "RP2040"])
  expect(fetcher).toHaveBeenCalledTimes(1)
  const request = fetcher.mock.calls[0][0] as Request
  expect(request.url).toBe(
    "http://127.0.0.1:12345/datasheet-api/datasheets/list",
  )
  expect(json(log).results[0].chip_name).toBe("RP2040")
})

test("normal searches still use JLCPCB by default", async () => {
  const { fetcher, log } = await run(["--json", "RP2040"], () =>
    Response.json({ components: [] }),
  )
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(String(fetcher.mock.calls[0][0])).toBe(
    "https://jlcsearch.tscircuit.com/api/search?limit=10&q=RP2040",
  )
  expect(json(log).results).toEqual([])
})

test("the configured default can select datasheets without a source flag", async () => {
  process.env.TSCIRCUIT_DEFAULT_SEARCH_SOURCE = "datasheets"
  const { log } = await run(["--json", "RP2040"])
  expect(json(log).results[0]).toEqual({
    source: "datasheets",
    ...part("RP2040"),
  })
})

for (const source of ["jlcpcb", "lcsc", "ti", "digikey", "mouser", "kicad"]) {
  test(`--${source} overrides the configured datasheet default`, async () => {
    process.env.TSCIRCUIT_DEFAULT_SEARCH_SOURCE = "datasheets"
    const { fetcher } = await run([`--${source}`, "--json", "RP2040"], () =>
      Response.json(source === "kicad" ? [] : { components: [] }),
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0][0])).not.toContain("/datasheets/list")
  })
}

test("datasheets combine with explicit providers and preserve source identities", async () => {
  const { fetcher, log } = await run(
    ["--datasheets", "--jlcpcb", "--json", "RP2040"],
    (url) =>
      Response.json(
        url.pathname.endsWith("/datasheets/list")
          ? { datasheets: inventory }
          : { components: [{ mfr: "RP2040", lcsc: 2040 }] },
      ),
  )
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(
    json(log).results.map((row: { source: string }) => row.source),
  ).toEqual(["datasheets", "jlcpcb"])
})

test("human output identifies the datasheet catalog and chip names", async () => {
  const { log } = await run(["--datasheets", "RP2040"])
  const text = log.mock.calls.flat().join("\n")
  expect(text).toContain("datasheet catalog")
  expect(text).toContain("1. RP2040")
  expect(text).not.toContain("stock")
})

test("an unmatched query returns an empty result list and names its source", async () => {
  const { log } = await run(["--datasheets", "unavailable-part-xyz"])
  expect(log.mock.calls.flat().join("\n")).toContain(
    'No results found for "unavailable-part-xyz" in datasheet catalog.',
  )
})

test("an empty inventory is a successful empty search", async () => {
  const { log } = await run(["--datasheets", "--json", "RP2040"], () =>
    Response.json({ datasheets: [] }),
  )
  expect(json(log).results).toEqual([])
})

test("matching is bounded, ranks exact names first, and is deterministic", async () => {
  const parts = [
    ...Array.from({ length: 15 }, (_, index) => part(`LM358-${index}`)),
    part("LM358"),
  ]
  const first = await run(["--datasheets", "--json", "LM358"], () =>
    Response.json({ datasheets: parts }),
  )
  const results = json(first.log).results
  expect(results).toHaveLength(10)
  expect(results[0].chip_name).toBe("LM358")
  first.fetcher.mockRestore()
  first.log.mockRestore()
  first.error.mockRestore()
  const second = await run(["--datasheets", "--json", "LM358"], () =>
    Response.json({ datasheets: [...parts].reverse() }),
  )
  expect(json(second.log).results).toEqual(results)
})

test("catalog metadata cannot overwrite the source or expand JSON output", async () => {
  const { log } = await run(["--datasheets", "--json", "RP2040"], () =>
    Response.json({
      datasheets: [
        { ...part("RP2040"), source: "jlcpcb", generated_tsx: "code" },
      ],
    }),
  )
  expect(json(log).results).toEqual([
    { source: "datasheets", ...part("RP2040") },
  ])
})

for (const [label, response, message] of [
  [
    "HTTP error",
    () => new Response(null, { status: 503 }),
    "Datasheet search failed (HTTP 503)",
  ],
  [
    "malformed inventory",
    () => Response.json({ datasheets: null }),
    "Datasheet search returned an invalid response",
  ],
  [
    "malformed row",
    () => Response.json({ datasheets: [{ chip_name: "RP2040" }] }),
    "Datasheet search returned an invalid response",
  ],
] as const) {
  test(`datasheet search fails on ${label}`, async () => {
    const exit = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit")
    })
    restore.push(() => exit.mockRestore())
    await expect(run(["--datasheets", "RP2040"], response)).rejects.toThrow(
      "exit",
    )
    expect(exit).toHaveBeenCalledWith(1)
    expect(console.error).toHaveBeenCalledWith(expect.any(String), message)
  })
}

test("invalid default sources fail clearly before making requests", async () => {
  process.env.TSCIRCUIT_DEFAULT_SEARCH_SOURCE = "invalid"
  const exit = spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit")
  })
  restore.push(() => exit.mockRestore())
  await expect(run(["RP2040"])).rejects.toThrow("exit")
  expect(console.error).toHaveBeenCalledWith(
    expect.any(String),
    expect.stringContaining("Invalid TSCIRCUIT_DEFAULT_SEARCH_SOURCE: invalid"),
  )
  expect(fetch).not.toHaveBeenCalled()
})

test("explicit flags also override an invalid default source", async () => {
  process.env.TSCIRCUIT_DEFAULT_SEARCH_SOURCE = "invalid"
  const { log } = await run(["--datasheets", "--json", "RP2040"])
  expect(json(log).results[0].source).toBe("datasheets")
})
