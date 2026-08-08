import { afterEach, describe, expect, it, spyOn } from "bun:test"
import { Command } from "commander"
import { registerSearch } from "../../../cli/search/register"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("search --mouser", () => {
  it("queries mousersearch and emits unified JSON results", async () => {
    let requestedUrl = ""
    globalThis.fetch = (async (input) => {
      requestedUrl = String(input)
      return new Response(
        JSON.stringify({
          components: [
            {
              mouser_product_number: "603-RC0603FR-0710KL",
              mfr: "RC0603FR-0710KL",
              manufacturer: "YAGEO",
              package: "0603 (1608 Metric)",
              description: "Thick Film Resistors - SMD 10K ohm 1%",
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
      "--mouser",
      "--json",
      "10k",
      "0603",
    ])

    expect(requestedUrl).toBe(
      "https://mousersearch.tscircuit.com/api/search?limit=10&q=10k%200603",
    )
    const output = String(log.mock.calls[0]?.[0])
    const parsed = JSON.parse(output)
    expect(parsed.query).toBe("10k 0603")
    expect(parsed.results).toEqual([
      {
        source: "mouser",
        mouser_product_number: "603-RC0603FR-0710KL",
        mfr: "RC0603FR-0710KL",
        manufacturer: "YAGEO",
        package: "0603 (1608 Metric)",
        description: "Thick Film Resistors - SMD 10K ohm 1%",
        stock: 1200,
        price: 0.01,
      },
    ])
    log.mockRestore()
  })
})
