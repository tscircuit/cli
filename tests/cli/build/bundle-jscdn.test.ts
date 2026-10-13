import { afterEach, expect, spyOn, test } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import path from "node:path"
import { tmpdir } from "node:os"
import {
  bundleJscdn,
  getJscdnImportMap,
  getRunframeDynamicImports,
} from "lib/site/bundle-jscdn"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"

const temporaryDirs: string[] = []
let fetchSpy: ReturnType<typeof spyOn> | undefined
afterEach(async () => {
  fetchSpy?.mockRestore()
  fetchSpy = undefined
  await Promise.all(
    temporaryDirs
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

test("discover all lazy runframe requests, including versions, without depending on minified names", () => {
  expect(
    getRunframeDynamicImports(`
    x("circuit-json-to-gltf"); x("circuit-json-to-step@0.0.19");
    x("circuit-json-to-gltf"); x("not-a-supported-package");
    // x("circuit-json-to-bom-csv")
    const unused = "circuit-to-svg";
  `),
  ).toEqual(["circuit-json-to-gltf", "circuit-json-to-step@0.0.19"])
})

test("site routes both importer CDN URLs to JavaScript files before loading runframe", () => {
  const html = getStaticIndexHtmlFile({
    files: [],
    jscdnBaseUrl: "./jscdn/",
    dynamicImportSpecifiers: ["circuit-json-to-step"],
    bundleJscdn: true,
  })
  const { imports } = JSON.parse(
    html.match(/<script type="importmap">(.*?)<\/script>/)![1],
  )
  expect(
    imports["https://jscdn.tscircuit.com/circuit-json-to-step/latest/+esm"],
  ).toBe("./jscdn/circuit-json-to-step/latest/+esm.js")
  expect(imports["https://esm.run/circuit-json-to-step"]).toBe(
    "./jscdn/circuit-json-to-step/latest/+esm.js",
  )
  expect(imports["./jscdn/circuit-json-to-step/latest/+esm"]).toBe(
    "./jscdn/circuit-json-to-step/latest/+esm.js",
  )
  expect(html).toContain('window.TSCIRCUIT_JSCDN_BASE_URL = "./jscdn/";')
  expect(html.indexOf('type="importmap"')).toBeLessThan(
    html.indexOf('type="module"'),
  )
  expect(getStaticIndexHtmlFile({ files: [] })).not.toContain("importmap")
})

test("custom bases preserve relative, root-relative and absolute URLs", () => {
  for (const base of [
    "jscdn",
    "../assets",
    "/assets",
    "https://example.com/assets/",
  ]) {
    const { imports } = getJscdnImportMap(["circuit-json-to-step@0.0.19"], base)
    const prefix = base === "jscdn" ? "./jscdn" : base.replace(/\/$/, "")
    expect(imports["https://esm.run/circuit-json-to-step@0.0.19"]).toBe(
      `${prefix}/circuit-json-to-step/0.0.19/+esm`,
    )
  }
})

test("bundle the full ESM graph, including cycles, lazy imports, shared modules and WASM assets", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "bundle-jscdn-"))
  temporaryDirs.push(outputDir)
  const origin = "https://jscdn.tscircuit.com"
  const stepUrl = `${origin}/circuit-json-to-step/latest/+esm`
  const gltfUrl = `${origin}/circuit-json-to-gltf/latest/+esm`
  const sources = new Map<string, string | Uint8Array>([
    [
      stepUrl,
      `import { value } from './shared.js'; export { value }; export const lazy = () => import('${gltfUrl}');`,
    ],
    [
      gltfUrl,
      `export { value } from '${origin}/circuit-json-to-step/latest/shared.js'; export const wasm = new URL('model.wasm', import.meta.url); if (globalThis.process?.versions?.node) { await import('node:fs'); await import('https://cdn.jsdelivr.net/npm/module/+esm'); await import('/npm/fs/+esm'); }`,
    ],
    [
      `${origin}/circuit-json-to-step/latest/shared.js`,
      `import '${stepUrl}'; export const value = 42;`,
    ],
    [
      `${origin}/circuit-json-to-gltf/latest/model.wasm`,
      new Uint8Array([0, 97, 115, 109]),
    ],
  ])
  const requested: string[] = []
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
    input: string | URL | Request,
  ) => {
    const url = String(input)
    requested.push(url)
    const source = sources.get(url)
    const response = new Response(
      source instanceof Uint8Array
        ? new Uint8Array(source).buffer
        : (source ?? "missing"),
      {
        status: source === undefined ? 404 : 200,
      },
    )
    Object.defineProperty(response, "url", { value: url })
    return response
  }) as typeof fetch)
  await bundleJscdn({
    outputDir,
    specifiers: ["circuit-json-to-step", "circuit-json-to-gltf"],
  })
  const step = await readFile(
    path.join(outputDir, "circuit-json-to-step/latest/+esm.js"),
    "utf8",
  )
  const gltf = await readFile(
    path.join(outputDir, "circuit-json-to-gltf/latest/+esm.js"),
    "utf8",
  )
  expect(step).not.toContain("https://")
  expect(gltf).not.toContain("https://jscdn.tscircuit.com")
  expect(step).toContain('import("../../circuit-json-to-gltf/latest/+esm.js")')
  expect(requested).toHaveLength(4)
  const sharedRelativePath = step.match(/from ("[^"]+")/)![1]
  const shared = await readFile(
    path.resolve(
      outputDir,
      "circuit-json-to-step/latest",
      JSON.parse(sharedRelativePath),
    ),
    "utf8",
  )
  expect(shared).toContain("../circuit-json-to-step/latest/+esm.js")
  const assetRelativePath = JSON.parse(gltf.match(/new URL\(("[^"]+")/)![1])
  expect(
    new Uint8Array(
      await readFile(
        path.resolve(
          outputDir,
          "circuit-json-to-gltf/latest",
          assetRelativePath,
        ),
      ),
    ),
  ).toEqual(new Uint8Array([0, 97, 115, 109]))
})

test("CDN fallback resolves relative dependencies against the response URL", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "bundle-jscdn-"))
  temporaryDirs.push(outputDir)
  const requested: string[] = []
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
    input: string | URL | Request,
  ) => {
    const url = String(input)
    requested.push(url)
    if (url.startsWith("https://jscdn.tscircuit.com"))
      return new Response("unavailable", { status: 500 })
    const source = url.endsWith("shared.js")
      ? "export const value = 1"
      : "export { value } from './shared.js'"
    const response = new Response(source)
    Object.defineProperty(response, "url", {
      value:
        "https://cdn.jsdelivr.net/npm/circuit-json-to-bom-csv@1.0.0/dist/index.js",
    })
    return response
  }) as typeof fetch)
  await bundleJscdn({ outputDir, specifiers: ["circuit-json-to-bom-csv"] })
  expect(requested).toContain(
    "https://cdn.jsdelivr.net/npm/circuit-json-to-bom-csv@1.0.0/dist/shared.js",
  )
})

test("a failed dependency rejects bundling with the failing URL", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "bundle-jscdn-"))
  temporaryDirs.push(outputDir)
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
    (async (_input: string | URL | Request) =>
      new Response("missing", { status: 404 })) as typeof fetch,
  )
  await expect(
    bundleJscdn({ outputDir, specifiers: ["circuit-json-to-step"] }),
  ).rejects.toThrow(
    "Failed to bundle JS CDN module https://jscdn.tscircuit.com/circuit-json-to-step/latest/+esm",
  )
})

test("default-only CommonJS CDN wrappers fall back to a browser bundle with named exports", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "bundle-jscdn-"))
  temporaryDirs.push(outputDir)
  const requested: string[] = []
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
    input: string | URL | Request,
  ) => {
    const url = String(input)
    requested.push(url)
    const source = url.startsWith("https://jscdn.tscircuit.com")
      ? "const __cjsModule = {exports:{}}; export default __cjsModule.exports;"
      : "export const parse = () => {};"
    const response = new Response(source)
    Object.defineProperty(response, "url", { value: url })
    return response
  }) as typeof fetch)
  await bundleJscdn({ outputDir, specifiers: ["circuit-to-svg"] })
  expect(requested).toEqual([
    "https://jscdn.tscircuit.com/circuit-to-svg/latest/+esm",
    "https://cdn.jsdelivr.net/npm/circuit-to-svg/+esm",
  ])
  expect(
    await readFile(
      path.join(outputDir, "circuit-to-svg/latest/+esm.js"),
      "utf8",
    ),
  ).toBe("export const parse = () => {};")
})
