import { expect, test } from "bun:test"
import { statSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { getRunFrameCdnUrl } from "cli/utils/get-runframe-cdn-url"
import { getSingleHtmlIndexFile } from "lib/site/get-single-html-index-file"

test("single HTML safely embeds circuit data and preserves viewer tabs", () => {
  const hostile =
    "</script><script>window.injected=true</script><!--\u2028\u2029"
  const circuitJson = [{ type: "schematic_text", text: hostile }]
  const html = getSingleHtmlIndexFile({
    circuitJson,
    standaloneScriptSrc: getRunFrameCdnUrl({ previewOnly: true }),
    packageName: hostile,
    jscdnBaseUrl: `https://cdn.example/${hostile}`,
  })
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  expect(script).toBeDefined()
  expect(script).not.toContain("</script>")
  expect(html.match(/<script\b/g)).toHaveLength(2)
  expect(html).toContain("<title>&lt;/script&gt;")

  const window: Record<string, any> = {}
  runInNewContext(script!, { window })
  expect(window.CIRCUIT_JSON).toEqual(circuitJson)
  expect(window.CIRCUIT_JSON_PREVIEW_PROPS).toMatchObject({
    defaultActiveTab: "pcb",
    showRightHeaderContent: true,
  })
  expect(window.TSCIRCUIT_JSCDN_BASE_URL).toBe(`https://cdn.example/${hostile}`)
  expect(window.injected).toBeUndefined()
  expect(html).not.toContain("TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST")
  expect(html).not.toContain("cdn.tailwindcss.com")
})

test("static CDN URLs are version-pinned RunFrame assets below the CDN file limit", () => {
  for (const previewOnly of [false, true]) {
    const filename = previewOnly
      ? "standalone-preview.min.js"
      : "standalone.min.js"
    const url = getRunFrameCdnUrl({ previewOnly })
    expect(url).toMatch(
      /^https:\/\/cdn\.jsdelivr\.net\/npm\/@tscircuit\/runframe@\d+\.\d+\.\d+\/dist\//,
    )
    expect(url.endsWith(`/${filename}`)).toBe(true)
    expect(url).not.toContain("browser.min.js")
    const exportName = previewOnly ? "standalone-preview" : "standalone"
    const bundlePath = import.meta.resolve(`@tscircuit/runframe/${exportName}`)
    expect(statSync(new URL(bundlePath)).size).toBeLessThan(50 * 1024 * 1024)
  }
})
