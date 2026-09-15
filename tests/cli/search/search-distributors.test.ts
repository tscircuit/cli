import { afterEach, expect, spyOn, test } from "bun:test"
import { Command } from "commander"
import { registerSearch } from "cli/search/register"

const part = (source: string) => ({
  mfr: "LM358DR",
  supplier_part_number: `${source}-LM358DR`,
  [`${source}_product_number`]: `${source}-LM358DR`,
  description: "Dual operational amplifier",
  package: "SOIC-8",
  stock: 1250,
  price: 0.25,
  product_url: `https://www.${source}.com/product/LM358DR`,
  datasheet_url: "https://www.ti.com/lit/gpn/lm358",
  parameters: { Channels: "2" },
})
let cleanups: Array<() => void> = []
afterEach(() => {
  for (const cleanup of cleanups.reverse()) cleanup()
  cleanups = []
})
const run = async (
  args: string[],
  respond = (url: URL) =>
    Response.json({ components: [part(url.hostname.split("search.")[0])] }),
) => {
  const implementation = Object.assign(
    async (input: Parameters<typeof fetch>[0]) =>
      respond(new URL(input instanceof Request ? input.url : String(input))),
    { preconnect: globalThis.fetch.preconnect },
  )
  const fetcher = spyOn(globalThis, "fetch").mockImplementation(implementation)
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
  return { fetcher, log }
}

for (const [source, label] of [
  ["digikey", "DigiKey"],
  ["mouser", "Mouser"],
]) {
  test(`--${source} requests JSON only from its selected service and preserves metadata`, async () => {
    const { fetcher, log } = await run([
      `--${source}`,
      "--json",
      "LM358/NOPB",
      "&",
      "amplifier",
    ])
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]).toEqual([
      `https://${source}search.tscircuit.com/api/search?limit=10&q=LM358%2FNOPB%20%26%20amplifier`,
      { headers: { accept: "application/json" } },
    ])
    expect(JSON.parse(String(log.mock.calls[0][0]))).toEqual({
      query: "LM358/NOPB & amplifier",
      results: [{ ...part(source), source }],
    })
  })

  test(`--${source} shows supplier part numbers and stock`, async () => {
    const { log } = await run([`--${source}`, "LM358"])
    const text = log.mock.calls.flat().join("\n")
    expect(text).toContain(`${label} search`)
    expect(text).toContain(`LM358DR (${source}-LM358DR)`)
    expect(text).toContain("1,250")
    expect(text).not.toContain("JLC search")
  })

  test(`--${source} uses its specific product number when the supplier alias is absent`, async () => {
    const { log } = await run([`--${source}`, "LM358"], () =>
      Response.json({
        components: [{ ...part(source), supplier_part_number: undefined }],
      }),
    )
    expect(log.mock.calls.flat().join("\n")).toContain(`(${source}-LM358DR)`)
  })

  test(`--${source} identifies its source for empty results`, async () => {
    const { log } = await run([`--${source}`, "missing"], () =>
      Response.json({ components: [] }),
    )
    expect(log.mock.calls.flat().join("\n")).toContain(
      `No results found for "missing" in ${label}.`,
    )
  })

  for (const [name, response, message] of [
    [
      "HTTP error",
      () => new Response(null, { status: 429 }),
      `${label} search failed (HTTP 429)`,
    ],
    [
      "malformed payload",
      () => Response.json({ components: null }),
      `${label} search returned an invalid response`,
    ],
  ] as const) {
    test(`--${source} exits unsuccessfully on ${name}`, async () => {
      const exit = spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit")
      })
      cleanups.push(() => exit.mockRestore())
      await expect(run([`--${source}`, "LM358"], response)).rejects.toThrow(
        "exit",
      )
      expect(exit).toHaveBeenCalledWith(1)
      expect(console.error).toHaveBeenCalledWith(expect.any(String), message)
    })
  }
}

test("distributor flags combine with TI and JLC without dropping source identities", async () => {
  const { fetcher, log } = await run([
    "--digikey",
    "--mouser",
    "--ti",
    "--jlcpcb",
    "--json",
    "LM358",
  ])
  expect(fetcher).toHaveBeenCalledTimes(4)
  const results = JSON.parse(String(log.mock.calls[0][0])).results
  expect(results.map((row: { source: string }) => row.source).sort()).toEqual([
    "digikey",
    "jlcpcb",
    "mouser",
    "ti",
  ])
})
