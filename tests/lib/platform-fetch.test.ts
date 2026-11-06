import { afterEach, expect, mock, test } from "bun:test"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { getPlatformFetch } from "lib/shared/get-platform-fetch"

const previous = process.env.TSCIRCUIT_PLATFORM_BASE_URL
const directories: string[] = []
afterEach(async () => {
  if (previous === undefined) delete process.env.TSCIRCUIT_PLATFORM_BASE_URL
  else process.env.TSCIRCUIT_PLATFORM_BASE_URL = previous
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true })
})

const fixture = async () => {
  const directory = await mkdtemp(join(tmpdir(), "platform responses "))
  directories.push(directory)
  const root = join(directory, "catalog #1")
  await mkdir(root)
  process.env.TSCIRCUIT_PLATFORM_BASE_URL = pathToFileURL(root).href
  const upstream = Object.assign(
    mock(async () => {
      throw new Error("Unexpected upstream request")
    }),
    { preconnect: mock(() => {}) },
  )
  const fetch = getPlatformFetch(upstream)
  const save = async (name: string, body: string) => {
    const file = join(root, name)
    await mkdir(join(file, ".."), { recursive: true })
    await writeFile(file, body)
    return pathToFileURL(file).href
  }
  return { directory, root, fetch, upstream, save }
}

test("file transport reads provider URLs and host-mapped URLs without upstream fetch", async () => {
  const { fetch, upstream, save } = await fixture()
  const url = await save("catalog/list", '{"parts":["RP2040"]}')
  expect(await fetch(url).then((r) => r.json())).toEqual({ parts: ["RP2040"] })
  await save("example.com/catalog.json", "[1,2]")
  const response = await fetch("https://example.com/catalog.json")
  expect(response.headers.get("content-type")).toBe("application/json")
  expect(await response.json()).toEqual([1, 2])
  expect(await fetch(url, { method: "HEAD" }).then((r) => r.text())).toBe("")
  fetch.preconnect("https://example.com")
  expect(upstream).not.toHaveBeenCalled()
  expect(upstream.preconnect).not.toHaveBeenCalled()
})

test("file transport normalizes query parameters and form posts", async () => {
  const { fetch, save } = await fixture()
  await save("example.com/search/limit%3D10%26q%3DRP2040.json", "[1]")
  expect(
    await fetch("https://example.com/search?q=RP2040&limit=10").then((r) =>
      r.json(),
    ),
  ).toEqual([1])
  expect(
    await fetch("https://example.com/search", {
      method: "POST",
      body: new URLSearchParams({ q: "RP2040", limit: "10" }),
    }).then((r) => r.json()),
  ).toEqual([1])
  await save("example.com/search/q%3D%2A.json", "[2]")
  expect(
    await fetch("https://example.com/search?q=*").then((r) => r.json()),
  ).toEqual([2])
})

test("missing files, unsupported methods, and invalid roots never fall back to HTTP", async () => {
  const { root, fetch, upstream } = await fixture()
  await expect(fetch("https://example.com/missing")).rejects.toThrow(
    "configured platform source",
  )
  await expect(
    fetch("https://example.com/missing", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    }),
  ).rejects.toThrow("configured platform source")
  await rm(root, { recursive: true })
  await expect(fetch("https://example.com/missing")).rejects.toThrow()
  expect(upstream).not.toHaveBeenCalled()
})

test("file transport blocks traversal and symlinks outside its configured directory", async () => {
  const { directory, root, fetch, upstream } = await fixture()
  const outside = join(directory, "private.json")
  await writeFile(outside, '"private"')
  await symlink(outside, join(root, "escape.json"))
  for (const target of [
    pathToFileURL(outside).href,
    pathToFileURL(join(root, "escape.json")).href,
  ])
    await expect(fetch(target)).rejects.toThrow("configured platform source")
  expect(upstream).not.toHaveBeenCalled()
})

test("file transport preserves cancellation", async () => {
  const { fetch, save, upstream } = await fixture()
  const url = await save("catalog.json", "[]")
  const abort = new AbortController()
  abort.abort(new Error("cancelled"))
  await expect(fetch(url, { signal: abort.signal })).rejects.toThrow(
    "cancelled",
  )
  expect(upstream).not.toHaveBeenCalled()
})

test("HTTP platform proxies keep their configured transport", async () => {
  process.env.TSCIRCUIT_PLATFORM_BASE_URL = "https://proxy.example.test"
  const upstream = Object.assign(
    mock(async () => Response.json({ ok: true })),
    { preconnect: mock(() => {}) },
  )
  const result = await getPlatformFetch(upstream)(
    "https://example.com/catalog.json",
  )
  expect(await result.json()).toEqual({ ok: true })
  expect((upstream.mock.calls as unknown as [[Request]])[0][0].url).toBe(
    "https://proxy.example.test/example.com/catalog.json",
  )
})
