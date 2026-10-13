import { expect, test } from "bun:test"
import { runInNewContext } from "node:vm"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"

test("a JS CDN URL cannot terminate the generated inline script", () => {
  const jscdnBaseUrl =
    'https://standalone.example/</script><script>window.injected=true</script>?q="'
  const html = getStaticIndexHtmlFile({ files: [], jscdnBaseUrl })
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  expect(script).toBeDefined()
  expect(script).not.toContain("</script>")

  const window: Record<string, unknown> = {}
  runInNewContext(script!, { window })
  expect(window.TSCIRCUIT_JSCDN_BASE_URL).toBe(jscdnBaseUrl)
  expect(window.injected).toBeUndefined()
})
