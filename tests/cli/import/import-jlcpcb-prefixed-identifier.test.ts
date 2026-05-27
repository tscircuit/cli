import { afterEach, expect, mock, test } from "bun:test"
import { Command } from "commander"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  mock.restore()
})

test("import command accepts jlcpcb-prefixed identifiers", async () => {
  const importCalls: Array<{
    partNumber: string
    projectDir: string
    options: { download?: boolean }
  }> = []

  mock.module("ora", () => ({
    default: () => ({
      text: "",
      start() {
        return this
      },
      stop() {
        return this
      },
      succeed() {
        return this
      },
      fail() {
        return this
      },
    }),
  }))

  mock.module("lib/import/import-component-from-jlcpcb", () => ({
    importComponentFromJlcpcb: async (
      partNumber: string,
      projectDir: string,
      options: { download?: boolean },
    ) => {
      importCalls.push({ partNumber, projectDir, options })
      return { filePath: "imports/RP2040.tsx" }
    },
  }))

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input)

    expect(url).toContain("https://jlcsearch.tscircuit.com/api/search")
    expect(url).toContain("q=jlcpcb%3AC2040")

    return new Response(JSON.stringify({ components: [] }), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  }) as typeof fetch

  const { registerImport } = await import("cli/import/register")

  const program = new Command()
  registerImport(program)

  await program.parseAsync(["import", "jlcpcb:C2040"], {
    from: "user",
  })

  expect(importCalls).toHaveLength(1)
  expect(importCalls[0]).toEqual({
    partNumber: "C2040",
    projectDir: process.cwd(),
    options: { download: undefined },
  })
})
