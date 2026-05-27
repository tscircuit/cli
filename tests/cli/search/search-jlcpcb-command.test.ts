import { afterEach, expect, test } from "bun:test"
import type { JlcpcbSearchResult } from "cli/search/format-jlcpcb-search-result"
import { registerSearch } from "cli/search/register"
import { Command } from "commander"

const originalFetch = globalThis.fetch
const originalConsoleLog = console.log

afterEach(() => {
  globalThis.fetch = originalFetch
  console.log = originalConsoleLog
})

test("search --jlcpcb prints prefixed JLCPCB identifiers", async () => {
  const output: string[] = []

  console.log = (...args: unknown[]) => {
    output.push(args.join(" "))
  }

  const components: JlcpcbSearchResult[] = [
    {
      lcsc: 2040,
      mfr: "RP2040",
      description: "RP2040",
      stock: 123456,
      package: "QFN-56",
      price: 0.75,
    },
  ]

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)

    expect(url).toContain("https://jlcsearch.tscircuit.com/api/search")
    expect(url).toContain("q=RP2040")

    return new Response(JSON.stringify({ components }), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  }) as typeof fetch

  const program = new Command()
  registerSearch(program)

  await program.parseAsync(["search", "--jlcpcb", "RP2040"], {
    from: "user",
  })

  expect(output).toContain("Found 1 component(s) in JLC search:")
  expect(output).toContain("1. jlcpcb:C2040 - RP2040 (stock: 123,456)")
})
