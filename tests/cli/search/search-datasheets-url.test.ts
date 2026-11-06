import { afterEach, expect, spyOn, test } from "bun:test"
import { searchDatasheets } from "cli/search/search-datasheets"
import { getRegistryApiUrl } from "lib/cli-config"

const original = {
  TSCIRCUIT_DATASHEET_API_BASE_URL:
    process.env.TSCIRCUIT_DATASHEET_API_BASE_URL,
  TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL:
    process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL,
}
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined
afterEach(() => {
  fetchSpy?.mockRestore()
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

const mockResponse = (response: Response) => {
  delete process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(async () => response, {
      preconnect: globalThis.fetch.preconnect,
    }),
  )
  return fetchSpy
}

test("datasheet search uses the configured server URL including its path prefix", async () => {
  process.env.TSCIRCUIT_DATASHEET_API_BASE_URL =
    "http://127.0.0.1:3000/catalog/datasheet-api/"
  const part = { chip_name: "RP2040", datasheet_id: "rp2040" }
  const fetch = mockResponse(Response.json({ datasheets: [part] }))
  expect(await searchDatasheets("rp2040")).toEqual([part])
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch.mock.calls[0][0]).toBe(
    "http://127.0.0.1:3000/catalog/datasheet-api/datasheets/list",
  )
})

test("datasheet search uses the normal endpoint when no server URL is configured", async () => {
  delete process.env.TSCIRCUIT_DATASHEET_API_BASE_URL
  const fetch = mockResponse(Response.json({ datasheets: [] }))
  expect(await searchDatasheets("rp2040")).toEqual([])
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch.mock.calls[0][0]).toBe(
    `${getRegistryApiUrl().replace(/\/+$/, "")}/datasheets/list`,
  )
})

test("an empty configured catalog does not fall back to the normal endpoint", async () => {
  process.env.TSCIRCUIT_DATASHEET_API_BASE_URL =
    "http://127.0.0.1:3000/catalog/datasheet-api"
  const fetch = mockResponse(Response.json({ datasheets: [] }))
  expect(await searchDatasheets("rp2040")).toEqual([])
  expect(fetch).toHaveBeenCalledTimes(1)
})

test("an unavailable configured catalog fails without trying the normal endpoint", async () => {
  process.env.TSCIRCUIT_DATASHEET_API_BASE_URL =
    "http://127.0.0.1:3000/catalog/datasheet-api"
  const fetch = mockResponse(new Response("Not found", { status: 404 }))
  await expect(searchDatasheets("rp2040")).rejects.toThrow(
    "Datasheet search failed (HTTP 404)",
  )
  expect(fetch).toHaveBeenCalledTimes(1)
})
