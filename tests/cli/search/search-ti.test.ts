import { afterEach, expect, spyOn, test } from "bun:test"
import { Command } from "commander"
import { registerSearch } from "cli/search/register"

const part = {
  mfr: "TPS62160DSGR",
  ti_product_number: "TPS62160DSGR",
  lcsc: null,
  package: "WSON",
  description: "Buck converter",
  stock: 1200,
  price: null,
  product_url: "https://www.ti.com/product/TPS62160/part-details/TPS62160DSGR",
}
let restore: Array<() => void> = []
afterEach(() => {
  for (const fn of restore.reverse()) fn()
  restore = []
})
const run = async (
  args: string[],
  response = () => Response.json({ components: [part] }),
) => {
  const fetchImplementation = Object.assign(async () => response(), {
    preconnect: globalThis.fetch.preconnect,
  })
  const fetcher = spyOn(globalThis, "fetch").mockImplementation(
    fetchImplementation,
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

test("--ti searches only TI with encoded queries and preserves metadata in JSON", async () => {
  const { fetcher, log } = await run([
    "--ti",
    "--json",
    "LM358/NOPB",
    "&",
    "amplifier",
  ])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toBe(
    "https://tisearch.tscircuit.com/api/search?limit=10&q=LM358%2FNOPB%20%26%20amplifier",
  )
  expect(JSON.parse(String(log.mock.calls[0][0]))).toEqual({
    query: "LM358/NOPB & amplifier",
    results: [{ ...part, source: "ti" }],
  })
})

test("--ti prints TI identities and stock without an LCSC identifier", async () => {
  const { log } = await run(["--ti", "TPS62160"])
  const text = log.mock.calls.flat().join("\n")
  expect(text).toContain("TI search")
  expect(text).toContain("TPS62160DSGR")
  expect(text).toContain("1,200")
  expect(text).not.toContain("Cnull")
  expect(text).not.toContain("JLC search")
})

test("--ti can be combined with JLC search", async () => {
  const { fetcher, log } = await run(["--ti", "--jlcpcb", "--json", "TPS62160"])
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(
    fetcher.mock.calls.map(([url]) => new URL(String(url)).hostname).sort(),
  ).toEqual(["jlcsearch.tscircuit.com", "tisearch.tscircuit.com"])
  expect(
    JSON.parse(String(log.mock.calls[0][0]))
      .results.map((r: { source: string }) => r.source)
      .sort(),
  ).toEqual(["jlcpcb", "ti"])
})

test("--ti reports an empty catalog result", async () => {
  const { log } = await run(["--ti", "missing"], () =>
    Response.json({ components: [] }),
  )
  expect(log.mock.calls.flat().join("\n")).toContain(
    'No results found for "missing" in Texas Instruments.',
  )
})

for (const [label, response, message] of [
  [
    "HTTP errors",
    () => new Response("unavailable", { status: 503 }),
    "TI search failed (HTTP 503)",
  ],
  [
    "invalid responses",
    () => Response.json({ error: "bad response" }),
    "TI search returned an invalid response",
  ],
] as const) {
  test(`--ti fails instead of reporting no matches for ${label}`, async () => {
    const exit = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit")
    })
    restore.push(() => exit.mockRestore())
    await expect(run(["--ti", "TPS62160"], response)).rejects.toThrow("exit")
    expect(exit).toHaveBeenCalledWith(1)
    expect(console.error).toHaveBeenCalledWith(expect.any(String), message)
  })
}
