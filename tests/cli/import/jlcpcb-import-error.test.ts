import { expect, test } from "bun:test"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"

test("importComponentFromJlcpcb explains EasyEDA network/search failures", async () => {
  try {
    await importComponentFromJlcpcb("C2040", "/tmp", {
      fetch: async () => new Response("blocked", { status: 400 }),
    })
  } catch (error) {
    expect(
      error instanceof Error ? error.message : String(error),
    ).toMatchInlineSnapshot(`
        "JLCPCB/EasyEDA import failed for C2040.
        Fetch failed while searching easyeda.com/api/components/search: Failed to search for the component"
      `)
    return
  }

  throw new Error("Expected importComponentFromJlcpcb to throw")
})
