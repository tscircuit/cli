import { afterAll, beforeAll, expect, test } from "bun:test"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"
import { type Browser, chromium } from "playwright"

const primaryUrl =
  "https://cdn.jsdelivr.net/npm/tscircuit@0.0.2890/dist/browser.min.js"
const fallbackUrl = "https://unpkg.com/tscircuit@0.0.2890/dist/browser.min.js"
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
})

afterAll(async () => {
  await browser?.close()
})

for (const failure of [null, "404", "network", "both"] as const) {
  test(`static site loads its viewer when CDN failure is ${failure}`, async () => {
    const page = await browser.newPage()
    const requests: string[] = []
    try {
      await page.route("**/*", async (route) => {
        const url = route.request().url()
        if (url === primaryUrl || url === fallbackUrl) {
          requests.push(url)
          if (url === primaryUrl && failure === "network") {
            await route.abort("failed")
            return
          }
          const failed =
            (url === primaryUrl && failure !== null) || failure === "both"
          await route.fulfill({
            status: failed ? 404 : 200,
            contentType: "application/javascript",
            headers: { "Access-Control-Allow-Origin": "*" },
            body: failed
              ? "Not found"
              : "document.querySelector('#root').textContent = 'Viewer loaded'",
          })
          return
        }
        await route.fulfill({ body: "" })
      })

      await page.setContent(
        getStaticIndexHtmlFile({ files: [], standaloneScriptSrc: primaryUrl }),
        { waitUntil: "networkidle" },
      )
      expect(requests).toEqual(
        failure === null ? [primaryUrl] : [primaryUrl, fallbackUrl],
      )
      const content = await page.locator("#root").textContent()
      expect(content === "Viewer loaded").toBe(failure !== "both")
      expect(await page.locator(`script[src="${fallbackUrl}"]`).count()).toBe(
        failure === null ? 0 : 1,
      )
    } finally {
      await page.close()
    }
  })
}

test("local and custom viewer scripts do not receive a CDN fallback", () => {
  for (const standaloneScriptSrc of [
    "./standalone.min.js",
    "https://custom.example/viewer.js",
  ]) {
    const html = getStaticIndexHtmlFile({ files: [], standaloneScriptSrc })
    expect(html).toContain(
      `<script type="module" src="${standaloneScriptSrc}"></script>`,
    )
    expect(html).not.toContain("unpkg.com")
  }
})
