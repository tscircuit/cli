import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { gzipSync } from "node:zlib"
import { createStandaloneSearchHandler } from "lib/server/standalone-search-catalog"

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})
const component = {
  lcsc: 123,
  mfr: "LM358",
  package: "SOIC-8",
  description: "Dual amplifier",
  stock: 0,
  price: 1,
  is_basic: true,
}
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "search-catalog-"))
  directories.push(directory)
  await mkdir(path.join(directory, "jlcsearch"))
  const filename = path.join(directory, "jlcsearch/search-catalog.json.gz")
  await writeFile(
    filename,
    gzipSync(
      JSON.stringify({
        schema_version: 1,
        source: "jlcpcb",
        coverage: "subset",
        generated_at: "2026-11-06T00:00:00.000Z",
        components: [
          component,
          {
            ...component,
            lcsc: 456,
            mfr: "LM358P",
            stock: 999,
            is_basic: false,
          },
        ],
      }),
    ),
  )
  const handler = createStandaloneSearchHandler(directory)
  const search = async (query: string) =>
    (await handler(new URL(`http://localhost/jlcsearch/api/search?${query}`)))!
  return { directory, filename, search }
}

test("searches arbitrary queries and supplier IDs, ranks exact identity before stock, and filters", async () => {
  const { search, filename } = await fixture()
  expect(
    (await (await search("q=lm358")).json()).components.map(
      (row: typeof component) => row.lcsc,
    ),
  ).toEqual([123, 456])
  expect((await (await search("q=C123")).json()).components[0].stock).toBe(0)
  expect(
    (await (await search("q=dual%20amplifier&is_basic=true")).json())
      .components,
  ).toHaveLength(1)
  expect((await (await search("q=missing")).json()).components).toEqual([])
  expect(
    (await (await search("q=LM358&package=DIP-8")).json()).components,
  ).toEqual([])
  expect((await search("limit=-1")).status).toBe(400)
  expect((await search("unknown_filter=1")).status).toBe(400)
  // The server retains a decoded catalog for subsequent requests.
  await rm(filename)
  expect(
    (await (await search("q=LM358&limit=1")).json()).components,
  ).toHaveLength(1)
})

test("rejects corrupt snapshots and symlinks outside the baked directory", async () => {
  const { directory, filename } = await fixture()
  await writeFile(filename, "not gzip")
  await expect(
    createStandaloneSearchHandler(directory)(
      new URL("http://localhost/jlcsearch/api/search?q=LM358"),
    ),
  ).rejects.toThrow()
  await rm(filename)
  const outside = await mkdtemp(path.join(tmpdir(), "outside-catalog-"))
  directories.push(outside)
  await writeFile(path.join(outside, "private"), "private")
  await symlink(path.join(outside, "private"), filename)
  await expect(
    createStandaloneSearchHandler(directory)(
      new URL("http://localhost/jlcsearch/api/search?q=LM358"),
    ),
  ).rejects.toThrow("Invalid catalog path")
})
