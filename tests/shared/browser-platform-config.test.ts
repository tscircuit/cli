import { afterEach, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import {
  bundleBrowserPlatformConfig,
  getBrowserPlatformConfig,
  getRunframeBootScript,
} from "lib/site/browser-platform-config"
import { getStaticIndexHtmlFile } from "lib/site/getStaticIndexHtmlFile"
import { loadRuntimeProjectConfig } from "lib/project-config"

const temporaryDirectories: string[] = []
const createProject = () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "tsci-browser-config-"),
  )
  temporaryDirectories.push(directory)
  return directory
}
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true })
})

test("JSON project platform options reach browsers and override local CDN default", async () => {
  const directory = createProject()
  fs.writeFileSync(
    path.join(directory, "tscircuit.config.json"),
    JSON.stringify({
      platformConfig: {
        jscdnBaseUrl: "https://standalone.example/jscdn",
        partsEngineDisabled: true,
      },
    }),
  )
  const config = await loadRuntimeProjectConfig(directory)
  expect(getBrowserPlatformConfig(config, "/jscdn")).toEqual({
    jscdnBaseUrl: "https://standalone.example/jscdn",
    partsEngineDisabled: true,
  })
})

test("callable hooks require an explicit browser module instead of disappearing from JSON", () => {
  expect(() =>
    getBrowserPlatformConfig(
      { platformConfig: { platformFetch: fetch } },
      "/jscdn",
    ),
  ).toThrow("browserPlatformConfigPath")
  expect(() =>
    getBrowserPlatformConfig(
      {
        platformConfig: {
          localCacheEngine: { getItem: () => null, setItem: () => {} },
        },
      },
      "/jscdn",
    ),
  ).toThrow("browserPlatformConfigPath")
})

test.each(["", "   ", 42])(
  "invalid jscdnBaseUrl %j fails before browser boot",
  (jscdnBaseUrl) => {
    expect(() =>
      getBrowserPlatformConfig(
        { platformConfig: { jscdnBaseUrl } } as any,
        "/jscdn",
      ),
    ).toThrow("non-empty string")
  },
)

test("browser module bundles local TS dependencies and retains callable hooks", async () => {
  const directory = createProject()
  fs.writeFileSync(
    path.join(directory, "browser-platform.ts"),
    `
    import { headerName } from "./headers"
    export default { platformFetch: (url: string, init?: RequestInit) => fetch(url, { ...init, headers: { [headerName]: "standalone" } }) }
  `,
  )
  fs.writeFileSync(
    path.join(directory, "headers.ts"),
    'export const headerName = "x-platform-policy"',
  )
  const source = await bundleBrowserPlatformConfig(
    directory,
    "browser-platform.ts",
  )
  expect(source).toContain("platformFetch")
  expect(source).toContain("x-platform-policy")
  expect(source).not.toContain('from "./headers"')
  const config = getBrowserPlatformConfig(
    {
      browserPlatformConfigPath: "browser-platform.ts",
      platformConfig: { platformFetch: fetch, useCloudAutorouter: false },
    },
    "./jscdn",
  )
  expect(config).toEqual({ jscdnBaseUrl: "./jscdn", useCloudAutorouter: false })
  const boot = getRunframeBootScript(
    "./standalone.min.js",
    "./platform-config.js",
  )
  expect(boot.indexOf("...platformConfig")).toBeLessThan(
    boot.indexOf('await import("./standalone.min.js")'),
  )
})

test("static HTML escapes injected config and has no implicit external assets", () => {
  const html = getStaticIndexHtmlFile({
    files: [],
    packageName: "</title><script>injected()</script>",
    platformConfig: { jscdnBaseUrl: "</script><script>injected()</script>" },
  })
  expect(html).not.toContain("<script>injected()")
  expect(html).toContain("\\u003c/script>")
  expect(html).not.toContain("cdn.tailwindcss.com")
  expect(html).not.toContain("github.com/tscircuit.png")
})

test("browser config exports executable hooks without inlining server environment values", async () => {
  const directory = createProject()
  const previous = process.env.TSCI_BROWSER_CONFIG_TEST_SECRET
  process.env.TSCI_BROWSER_CONFIG_TEST_SECRET = "safe-fake-env-value-for-test"
  fs.writeFileSync(
    path.join(directory, "browser-platform.ts"),
    `export default {
    platformFetch: async (url: RequestInfo | URL) => new Response(String(url)),
    unrelatedServerEnvironment: process.env.TSCI_BROWSER_CONFIG_TEST_SECRET,
  }`,
  )
  try {
    const source = (await bundleBrowserPlatformConfig(
      directory,
      "browser-platform.ts",
    ))!
    expect(source).not.toContain("safe-fake-env-value-for-test")
    const module = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
    )
    expect(typeof module.default.platformFetch).toBe("function")
    expect(
      await (await module.default.platformFetch("standalone://hook")).text(),
    ).toBe("standalone://hook")
  } finally {
    if (previous === undefined)
      delete process.env.TSCI_BROWSER_CONFIG_TEST_SECRET
    else process.env.TSCI_BROWSER_CONFIG_TEST_SECRET = previous
  }
})
