import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { loadRuntimeProjectConfig } from "lib/project-config"
import { projectConfigSchema } from "lib/project-config/project-config-schema"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"
import schemaJson from "../../types/tscircuit.config.schema.json"

const tabs = [
  {
    tabName: "Sysconfig",
    iframeUrl: "https://sysconfig-viewer.tscircuit.com/#eJw+/=",
    mainComponentPath: "boards/mspm0.circuit.tsx",
  },
  { tabName: "Documentation", iframeUrl: "https://docs.tscircuit.com/" },
]
const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true })),
  )
})

test("config preserves scoped and global iframe tabs", () => {
  expect(
    projectConfigSchema.parse({ extraRunFrameTabs: tabs }).extraRunFrameTabs,
  ).toEqual(tabs)
  expect(projectConfigSchema.parse({}).extraRunFrameTabs).toBeUndefined()
  expect(schemaJson.properties.extraRunFrameTabs.items.required).toEqual([
    "tabName",
    "iframeUrl",
  ])
})

test.each([
  "javascript:alert(1)",
  "data:text/html,hello",
  "file:///tmp/viewer.html",
  "https://user:pass@example.com/",
  "/viewer",
])("config rejects an unsafe or relative iframe URL: %s", (iframeUrl) => {
  expect(
    projectConfigSchema.safeParse({
      extraRunFrameTabs: [{ tabName: "Sysconfig", iframeUrl }],
    }).success,
  ).toBeFalse()
})

test("config rejects empty tab names and circuit paths", () => {
  for (const tab of [
    { ...tabs[0], tabName: "  " },
    { ...tabs[0], mainComponentPath: "  " },
  ]) {
    expect(
      projectConfigSchema.safeParse({ extraRunFrameTabs: [tab] }).success,
    ).toBeFalse()
  }
})

test("reloading configuration observes changed and removed tabs", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "tsci-extra-tabs-"))
  tempDirs.push(dir)
  const configPath = path.join(dir, "tscircuit.config.json")
  await writeFile(configPath, JSON.stringify({ extraRunFrameTabs: tabs }))
  expect((await loadRuntimeProjectConfig(dir))?.extraRunFrameTabs).toEqual(tabs)
  await writeFile(
    configPath,
    JSON.stringify({ extraRunFrameTabs: tabs.slice(1) }),
  )
  expect((await loadRuntimeProjectConfig(dir))?.extraRunFrameTabs).toEqual(
    tabs.slice(1),
  )
  await rm(configPath)
  expect(await loadRuntimeProjectConfig(dir)).toBeNull()
})

test("static site injects tabs before the bundle and safely round-trips script-like text", () => {
  const maliciousTab = {
    tabName: "</script><script>window.injected=true</script>\u2028\u2029",
    iframeUrl:
      "https://example.com/#</script><script>window.injected=true</script>",
    mainComponentPath: 'boards/"<board>.circuit.tsx',
  }
  const extraRunFrameTabs = [...tabs, maliciousTab]
  const html = getStaticIndexHtmlFile({ files: [], extraRunFrameTabs })
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  expect(script).toBeDefined()
  expect(script).not.toContain("</script>")
  const window: Record<string, unknown> = {}
  runInNewContext(script!, { window })
  expect(window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual(extraRunFrameTabs)
  expect(window.injected).toBeUndefined()
  expect(html.indexOf("window.TSCIRCUIT_EXTRA_RUNFRAME_TABS")).toBeLessThan(
    html.indexOf('<script type="module"'),
  )
})

test("static site without extra tabs injects an empty list", () => {
  const html = getStaticIndexHtmlFile({ files: [] })
  expect(html).toContain("window.TSCIRCUIT_EXTRA_RUNFRAME_TABS = [];")
})
