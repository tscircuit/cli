import { afterEach, describe, expect, it, spyOn } from "bun:test"
import { Command } from "commander"
import { registerSearch } from "../../../cli/search/register"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("search --digikey", () => {
  it("queries digikeysearch and emits unified JSON results", async () => {
    let requestedUrl = ""
    globalThis.fetch = (async (input) => {
      requestedUrl = String(input)
      return new Response(
        JSON.stringify({
          components: [
            {
              digikey_product_number: "311-10.0KHRCT-ND",
              mfr: "RC0603FR-0710KL",
              manufacturer: "YAGEO",
              package: "0603 (1608 Metric)",
              description: "RES 10K OHM 1% 1/10W 0603",
              stock: 1200,
              price: 0.01,
            },
          ],
        }),
        { status: 200 },
      )
    }) as typeof fetch

    const log = spyOn(console, "log").mockImplementation(() => {})
    const program = new Command().name("tsci")
    registerSearch(program)

    await program.parseAsync([
      "node",
      "tsci",
      "search",
      "--digikey",
      "--json",
      "10k",
      "0603",
    ])

    expect(requestedUrl).toBe(
      "https://digikeysearch.tscircuit.com/api/search?limit=10&q=10k%200603",
    )
    const output = String(log.mock.calls[0]?.[0])
    const parsed = JSON.parse(output)
    expect(parsed.query).toBe("10k 0603")
    expect(parsed.results).toEqual([
      {
        source: "digikey",
        digikey_product_number: "311-10.0KHRCT-ND",
        mfr: "RC0603FR-0710KL",
        manufacturer: "YAGEO",
        package: "0603 (1608 Metric)",
        description: "RES 10K OHM 1% 1/10W 0603",
        stock: 1200,
        price: 0.01,
      },
    ])
    log.mockRestore()
  })
})
