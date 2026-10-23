import { expect, spyOn, test } from "bun:test"
import { getRunFrameCdnUrl } from "cli/utils/get-runframe-cdn-url"

test("CDN builds resolve the latest RunFrame release each time and pin its standalone URL", async () => {
  const fetchSpy = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json({ version: "0.0.9998" }))
    .mockResolvedValueOnce(Response.json({ version: "0.0.9999" }))
  try {
    expect(await getRunFrameCdnUrl()).toBe(
      "https://cdn.jsdelivr.net/npm/@tscircuit/runframe@0.0.9998/dist/standalone.min.js",
    )
    expect(await getRunFrameCdnUrl()).toBe(
      "https://cdn.jsdelivr.net/npm/@tscircuit/runframe@0.0.9999/dist/standalone.min.js",
    )
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    for (const [url] of fetchSpy.mock.calls) {
      expect(url).toBe("https://registry.npmjs.org/@tscircuit/runframe/latest")
    }
  } finally {
    fetchSpy.mockRestore()
  }
})

test("CDN builds report registry HTTP failures", async () => {
  const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response("Unavailable", {
      status: 503,
      statusText: "Service Unavailable",
    }),
  )
  try {
    await expect(getRunFrameCdnUrl()).rejects.toThrow(
      "Failed to fetch RunFrame version from npm: Service Unavailable",
    )
  } finally {
    fetchSpy.mockRestore()
  }
})

test("CDN builds reject metadata without a version", async () => {
  const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValueOnce(
    Response.json({}),
  )
  try {
    await expect(getRunFrameCdnUrl()).rejects.toThrow(
      "npm returned an invalid RunFrame version",
    )
  } finally {
    fetchSpy.mockRestore()
  }
})

test("CDN builds propagate registry connection failures", async () => {
  const fetchSpy = spyOn(globalThis, "fetch").mockRejectedValueOnce(
    new Error("Registry connection failed"),
  )
  try {
    await expect(getRunFrameCdnUrl()).rejects.toThrow(
      "Registry connection failed",
    )
  } finally {
    fetchSpy.mockRestore()
  }
})
