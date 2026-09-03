import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type { AnyCircuitElement } from "circuit-json"
import { inlineLocalCadModels } from "lib/shared/inline-local-cad-models"

test("local CAD bytes are fetchable and input URLs are preserved", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "tsci-local-cad-"))
  globalThis.deferredCleanupFns.push(() =>
    rm(dir, { recursive: true, force: true }),
  )
  const file = path.join(dir, "part with spaces.obj")
  const bytes = Buffer.from([0, 10, 127, 128, 255])
  await writeFile(file, bytes)
  const urls = [
    "./part with spaces.obj",
    "part with spaces.obj",
    file,
    pathToFileURL(file).href,
  ]
  const input = urls.map((url) => ({
    type: "cad_component",
    model_obj_url: url,
  })) as AnyCircuitElement[]
  const output = await inlineLocalCadModels(input, dir)
  for (const element of output as any[]) {
    const response = await fetch(element.model_obj_url)
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes)
  }
  expect(input.map((element: any) => element.model_obj_url)).toEqual(urls)
})

test("remote URLs and uninstalled registry package assets keep their resolver", async () => {
  const input = [
    { type: "cad_component", model_obj_url: "https://example.com/part.obj" },
    {
      type: "cad_component",
      model_obj_url: "data:application/octet-stream;base64,dGVzdA==",
    },
    {
      type: "cad_component",
      model_obj_url: "./node_modules/@tsci/not-installed.part/part.obj",
    },
    { type: "cad_component", model_gltf_url: "./model.gltf" },
  ] as AnyCircuitElement[]
  expect(await inlineLocalCadModels(input)).toEqual(input)
})

test("missing downloaded files produce a local path error", async () => {
  const input = [
    { type: "cad_component", model_obj_url: "./imports/missing.obj" },
  ] as AnyCircuitElement[]
  await expect(inlineLocalCadModels(input)).rejects.toThrow(
    "Could not read local CAD model ./imports/missing.obj",
  )
})
