import { expect, spyOn, test } from "bun:test"
import { readdir, rm } from "node:fs/promises"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
import { temporaryDirectory } from "tempy"
import s4SearchResponse from "../../fixtures/assets/C41411351.search.json"

test("exact S4 import explains missing EasyEDA library content without writing files", async () => {
  const projectDir = temporaryDirectory()
  const fetchMock = spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json(s4SearchResponse),
  )

  try {
    await expect(
      importComponentFromJlcpcb("C41411351", projectDir, {
        useExactFootprint: true,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Component not found in EasyEDA library search for "C41411351". A supplier catalog listing does not guarantee importable symbol/footprint data."`,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [input, init] = fetchMock.mock.calls[0]
    const request = new Request(input, init)
    expect(request.url).toBe("https://easyeda.com/api/components/search")
    expect(request.method).toBe("POST")
    expect(new URLSearchParams(await request.text()).get("wd")).toBe(
      "C41411351",
    )
    expect(await readdir(projectDir)).toEqual([])
  } finally {
    fetchMock.mockRestore()
    await rm(projectDir, { recursive: true, force: true })
  }
})
