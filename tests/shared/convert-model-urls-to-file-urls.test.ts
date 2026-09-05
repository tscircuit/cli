import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { convertModelUrlsToFileUrls } from "cli/build/convert-model-urls-to-file-urls"

test("local models remain file references and Circuit JSON is not mutated", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "tsci-model-paths-"))
  try {
    const file = path.join(dir, "part with spaces.obj")
    await writeFile(file, "v 0 0 0")
    const urls = [
      "./part with spaces.obj",
      "part with spaces.obj",
      file,
      pathToFileURL(file).href,
    ]
    const input = urls.map((url) => ({
      type: "cad_component",
      model_obj_url: url,
    }))
    const output = convertModelUrlsToFileUrls(input, dir)
    expect(output.map((element) => element.model_obj_url)).toEqual(
      urls.map(() => pathToFileURL(file).href),
    )
    expect(input.map((element) => element.model_obj_url)).toEqual(urls)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("remote URLs and uninstalled registry assets retain their resolver", () => {
  const input = [
    { model_obj_url: "https://example.com/part.obj" },
    { model_obj_url: "data:application/octet-stream;base64,dGVzdA==" },
    { model_obj_url: "./node_modules/@tsci/not-installed.part/part.obj" },
  ]
  expect(convertModelUrlsToFileUrls(input)).toEqual(input)
})
