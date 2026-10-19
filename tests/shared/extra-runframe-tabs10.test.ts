import { expect, test } from "bun:test"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"

test("static site without extra tabs injects an empty list", () => {
  const html = getStaticIndexHtmlFile({ files: [] })
  expect(html).toContain("window.TSCIRCUIT_EXTRA_RUNFRAME_TABS = [];")
})
