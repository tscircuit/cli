import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { registerSearch } from "cli/search/register"
import { Command } from "commander"

const sources = [
  "datasheets",
  "kicad",
  "tscircuit",
  "ti",
  "digikey",
  "mouser",
  "jlcpcb",
]
const environmentVariables = [
  "TSCIRCUIT_DEFAULT_SEARCH_SOURCES",
  "TSCIRCUIT_DATASHEET_API_BASE_URL",
  "TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL",
  "TSCIRCUIT_JLCSEARCH_BASE_URL",
  "TSCIRCUIT_DIGIKEY_BASE_URL",
  "TSCIRCUIT_MOUSER_BASE_URL",
]
let cleanups: Array<() => void> = []
beforeEach(() => {
  for (const variable of environmentVariables) {
    const original = process.env[variable]
    cleanups.push(() => {
      if (original === undefined) Reflect.deleteProperty(process.env, variable)
      else process.env[variable] = original
    })
    Reflect.deleteProperty(process.env, variable)
  }
})
afterEach(() => {
  for (const cleanup of cleanups.reverse()) cleanup()
  cleanups = []
})

const respond = (url: URL, empty = false) => {
  if (url.pathname.endsWith("/datasheets/list"))
    return Response.json({
      datasheets: empty ? [] : [{ datasheet_id: "lm358", chip_name: "LM358" }],
    })
  if (url.pathname.endsWith("/packages/search"))
    return Response.json({
      packages: empty ? [] : [{ name: "test/lm358", version: "1.0.0" }],
    })
  if (url.pathname.endsWith("/kicad_files.json"))
    return Response.json(empty ? [] : ["Amplifier.pretty/LM358.kicad_mod"])
  if (/^(jlc|ti|digikey|mouser)search\.tscircuit\.com$/.test(url.hostname))
    return Response.json({
      components: empty
        ? []
        : [{ mfr: "LM358", lcsc: 123, stock: 10, description: "Amplifier" }],
    })
  throw new Error(`Unexpected request: ${url}`)
}

const run = async (
  args: string[],
  response: (url: URL) => Response | Promise<Response> = respond,
) => {
  const fetcher = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (input: Parameters<typeof fetch>[0]) =>
        response(new URL(input instanceof Request ? input.url : String(input))),
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  const log = spyOn(console, "log").mockImplementation(() => {})
  const error = spyOn(console, "error").mockImplementation(() => {})
  cleanups.push(
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

test("an unqualified search queries all seven sources and preserves their identities", async () => {
  const { fetcher, log, error } = await run(["--json", "LM358"])
  expect(fetcher).toHaveBeenCalledTimes(7)
  expect(
    json(log).results.map((row: { source: string }) => row.source),
  ).toEqual(sources)
  expect(json(log).errors).toBeUndefined()
  expect(error).not.toHaveBeenCalled()
})

test("an unqualified search starts every source before waiting for responses", async () => {
  let started = 0
  let release!: () => void
  const allStarted = new Promise<void>((resolve) => {
    release = resolve
  })
  const { fetcher, log } = await run(["--json", "LM358"], async (url) => {
    started++
    if (started === 7) release()
    await allStarted
    return respond(url)
  })
  expect(fetcher).toHaveBeenCalledTimes(7)
  expect(json(log).results).toHaveLength(7)
})

test("human output includes results from every default source", async () => {
  const { log } = await run(["LM358"])
  const text = log.mock.calls.flat().join("\n")
  for (const label of [
    "datasheet catalog",
    "KiCad",
    "tscircuit registry",
    "TI search",
    "DigiKey",
    "Mouser",
    "JLC search",
  ])
    expect(text).toContain(label)
})

test("a failed default source does not discard the other sources' results", async () => {
  const { fetcher, log, error } = await run(["--json", "LM358"], (url) => {
    if (url.hostname === "mousersearch.tscircuit.com")
      throw new Error("catalog unavailable")
    return respond(url)
  })
  expect(fetcher).toHaveBeenCalledTimes(7)
  expect(
    json(log).results.map((row: { source: string }) => row.source),
  ).toEqual(sources.filter((source) => source !== "mouser"))
  expect(json(log).errors).toEqual([
    { source: "mouser", message: "catalog unavailable" },
  ])
  expect(error).toHaveBeenCalledWith(
    expect.stringContaining("mouser"),
    "catalog unavailable",
  )
})

test("malformed registry results are isolated from valid catalog results", async () => {
  const { log } = await run(["--json", "LM358"], (url) =>
    url.pathname.endsWith("/packages/search")
      ? Response.json({ packages: null })
      : respond(url),
  )
  expect(json(log).results).toHaveLength(6)
  expect(json(log).errors).toEqual([
    {
      source: "tscircuit",
      message: "Registry search returned an invalid response",
    },
  ])
})

test("failed sources are excluded from the no-results summary", async () => {
  const { log, error } = await run(["missing"], (url) =>
    url.hostname === "mousersearch.tscircuit.com"
      ? new Response(null, { status: 503 })
      : respond(url, true),
  )
  const text = log.mock.calls.flat().join("\n")
  expect(text).toContain("No results found")
  expect(text).toContain("DigiKey")
  expect(text).not.toContain("Mouser")
  expect(error).toHaveBeenCalledWith(
    expect.stringContaining("mouser"),
    expect.stringContaining("HTTP 503"),
  )
})

test("search exits unsuccessfully when every selected source fails", async () => {
  const exit = spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit")
  })
  cleanups.push(() => exit.mockRestore())
  await expect(
    run(["--json", "LM358"], () => Response.json({})),
  ).rejects.toThrow("exit")
  expect(exit).toHaveBeenCalledWith(1)
  expect(fetch).toHaveBeenCalledTimes(7)
  expect(console.log).not.toHaveBeenCalled()
  const message = (console.error as ReturnType<typeof spyOn>).mock.calls
    .flat()
    .join(" ")
  for (const source of sources) expect(message).toContain(source)
})

test("distributor output order is independent of response completion order", async () => {
  const { log } = await run(["--json", "LM358"], async (url) => {
    if (url.hostname === "digikeysearch.tscircuit.com") await Bun.sleep(10)
    return respond(url)
  })
  expect(
    json(log).results.map((row: { source: string }) => row.source),
  ).toEqual(sources)
})

test("the LCSC alias and JLCPCB flag query their shared source only once", async () => {
  const { fetcher, log } = await run(["--jlcpcb", "--lcsc", "--json", "LM358"])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(
    json(log).results.map((row: { source: string }) => row.source),
  ).toEqual(["jlcpcb"])
})
