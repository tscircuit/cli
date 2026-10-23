import { expect, test } from "bun:test"
import { statSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { getRunFrameCdnUrl } from "cli/utils/get-runframe-cdn-url"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"

test("embedded Circuit JSON safely round-trips through the standalone viewer's Blob URL", async () => {
  const hostile =
    "</script><script>window.injected=true</script><!--\u2028\u2029"
  const embeddedCircuitJson = [{ type: "schematic_text", text: hostile }]
  const files = [
    { filePath: hostile, fileStaticAssetUrl: "./board/circuit.json" },
  ]
  const extraRunFrameTabs = [
    { tabName: "Docs", iframeUrl: "https://example.com" },
  ]
  const html = getStaticIndexHtmlFile({
    files,
    embeddedCircuitJson,
    standaloneScriptSrc: getRunFrameCdnUrl(),
    packageName: hostile,
    defaultMainComponentPath: hostile,
    extraRunFrameTabs,
  })
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  expect(script).toBeDefined()
  expect(script).not.toContain("</script>")
  expect(html.match(/<script\b/g)).toHaveLength(4)
  expect(html).toContain("<title>&lt;/script&gt;")

  const window: Record<string, any> = {}
  runInNewContext(script!, { window, URL, Blob })
  const file = window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST[0]
  expect(file.filePath).toBe(hostile)
  expect(file.fileStaticAssetUrl).toStartWith("blob:")
  try {
    const response = await fetch(file.fileStaticAssetUrl)
    expect(response.headers.get("Content-Type")?.split(";")[0]).toBe(
      "application/json",
    )
    expect(await response.json()).toEqual(embeddedCircuitJson)
  } finally {
    URL.revokeObjectURL(file.fileStaticAssetUrl)
  }
  expect(window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual(extraRunFrameTabs)
  expect(window.TSCIRCUIT_DEFAULT_MAIN_COMPONENT_PATH).toBe(hostile)
  expect(window.TSCIRCUIT_PACKAGE_NAME).toBe(hostile)
  expect(window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI).toBe(false)
  expect(window.injected).toBeUndefined()
})

test("local and multi-circuit sites keep their original file references", () => {
  const files = [
    { filePath: "a.circuit.tsx", fileStaticAssetUrl: "./a/circuit.json" },
    { filePath: "b.circuit.tsx", fileStaticAssetUrl: "./b/circuit.json" },
  ]
  const html = getStaticIndexHtmlFile({ files })
  const window: Record<string, any> = {}
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], { window })
  expect(window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST).toEqual(files)
  expect(html).not.toContain("URL.createObjectURL")
  expect(() =>
    getStaticIndexHtmlFile({ files, embeddedCircuitJson: [] }),
  ).toThrow("exactly one circuit")
})

test("the CDN URL pins the worker-free standalone asset below jsDelivr's file limit", () => {
  const url = getRunFrameCdnUrl()
  expect(url).toMatch(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/@tscircuit\/runframe@\d+\.\d+\.\d+\/dist\/standalone\.min\.js$/,
  )
  expect(url).not.toContain("browser.min.js")
  expect(
    statSync(new URL(import.meta.resolve("@tscircuit/runframe/standalone")))
      .size,
  ).toBeLessThan(50 * 1024 * 1024)
})
