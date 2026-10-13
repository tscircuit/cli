import { beforeAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { createHttpServer } from "lib/server/createHttpServer"
// @ts-ignore
import runFrameStandaloneBundleContent from "@tscircuit/runframe/standalone" with {
  type: "text",
}
import {
  BUNDLED_BROWSER_MODULE_NAMES,
  getBundledBrowserModulesDirectory,
  resolveBundledBrowserModule,
  type BundledBrowserModuleManifest,
} from "lib/shared/bundled-browser-modules"
import { ensureBrowserModules } from "../fixtures/ensure-browser-modules"

beforeAll(ensureBrowserModules, 30_000)

test("dev server serves packaged latest and pinned module versions without proxy fallback", async () => {
  const { server } = await createHttpServer({ port: 0 })
  const origin = `http://localhost:${(server.address() as any).port}`
  try {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(getBundledBrowserModulesDirectory(), "manifest.json"),
        "utf8",
      ),
    ) as BundledBrowserModuleManifest
    for (const name of BUNDLED_BROWSER_MODULE_NAMES) {
      const latest = await fetch(`${origin}/jscdn/${name}/latest/+esm`)
      expect(latest.status).toBe(200)
      expect(latest.headers.get("Content-Type")).toContain(
        "application/javascript",
      )
      const content = await latest.text()
      expect(content.length).toBeGreaterThan(100)
      const pinned = await fetch(
        `${origin}/jscdn/${name}/${manifest[name].version}/+esm`,
      )
      expect(await pinned.text()).toBe(content)
      const unknown = await fetch(`${origin}/jscdn/${name}/0.0.0-unknown/+esm`)
      expect(unknown.status).toBe(404)
      expect(unknown.headers.get("Location")).toBeNull()
    }
    expect(
      (await fetch(`${origin}/jscdn/not-bundled/latest/+esm`)).status,
    ).toBe(404)
    expect(
      (
        await fetch(`${origin}/jscdn/circuit-json-to-step/latest/+esm`, {
          method: "POST",
        })
      ).status,
    ).toBe(405)
    const head = await fetch(
      `${origin}/jscdn/circuit-json-to-step/latest/+esm`,
      { method: "HEAD" },
    )
    expect(head.status).toBe(200)
    expect(await head.text()).toBe("")
    expect(
      resolveBundledBrowserModule("/jscdn/../package.json/latest/+esm"),
    ).toBeUndefined()
    expect(
      resolveBundledBrowserModule("/jscdn/circuit-json-to-step/%2e%2e/+esm"),
    ).toBeUndefined()
    const html = await fetch(origin).then((response) => response.text())
    expect(html).toContain('"jscdnBaseUrl":"/jscdn"')
    expect(html).not.toContain("cdn.tailwindcss.com")
    expect(html).not.toContain("github.com/tscircuit.png")
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}, 30_000)

test("dev browser config module preserves custom fetch hooks and project scalar defaults", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-dev-config-"))
  fs.writeFileSync(
    path.join(directory, "tscircuit.config.ts"),
    `export default {
    browserPlatformConfigPath: "./browser-platform.ts",
    platformConfig: { jscdnBaseUrl: "/enterprise-jscdn", platformFetch: fetch },
  }`,
  )
  fs.writeFileSync(
    path.join(directory, "browser-platform.ts"),
    "export default { platformFetch: (url: string, init?: RequestInit) => fetch(url, init) }",
  )
  const { server } = await createHttpServer({ port: 0, projectDir: directory })
  const origin = `http://localhost:${(server.address() as any).port}`
  try {
    const html = await fetch(origin).then((response) => response.text())
    expect(html).toContain('"jscdnBaseUrl":"/enterprise-jscdn"')
    expect(html).toContain('import platformConfig from "/platform-config.js"')
    expect(html).toContain('await import("/standalone.min.js")')
    const module = await fetch(`${origin}/platform-config.js`)
    expect(module.status).toBe(200)
    expect(await module.text()).toContain("platformFetch")
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("missing explicitly configured standalone falls back to packaged script without a CDN redirect", async () => {
  const previous = process.env.RUNFRAME_STANDALONE_FILE_PATH
  process.env.RUNFRAME_STANDALONE_FILE_PATH = path.join(
    os.tmpdir(),
    "tsci-does-not-exist",
    "standalone.min.js",
  )
  const { server } = await createHttpServer({ port: 0 })
  try {
    const response = await fetch(
      `http://localhost:${(server.address() as any).port}/standalone.min.js`,
    )
    expect(response.status).toBe(
      runFrameStandaloneBundleContent.includes("TSCIRCUIT_PLATFORM_CONFIG")
        ? 200
        : 409,
    )
    expect(response.headers.get("Location")).toBeNull()
    expect((await response.text()).length).toBeGreaterThan(100)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    if (previous === undefined) delete process.env.RUNFRAME_STANDALONE_FILE_PATH
    else process.env.RUNFRAME_STANDALONE_FILE_PATH = previous
  }
})

test.each([
  "RUNFRAME_STANDALONE_FILE_PATH",
  "TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH",
])("dev server rejects older standalone selected by %s", async (variable) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-old-runframe-"))
  const bundlePath = path.join(directory, "standalone.min.js")
  fs.writeFileSync(bundlePath, "LEGACY_SELECTED_RUNFRAME")
  const previous = process.env[variable]
  process.env[variable] = bundlePath
  const { server } = await createHttpServer({ port: 0 })
  try {
    const response = await fetch(
      `http://localhost:${(server.address() as any).port}/standalone.min.js`,
    )
    expect(response.status).toBe(409)
    const error = await response.text()
    expect(error).toContain("does not support TSCIRCUIT_PLATFORM_CONFIG")
    expect(error).toContain("Upgrade")
    expect(error).not.toContain("LEGACY_SELECTED_RUNFRAME")
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    if (previous === undefined) delete process.env[variable]
    else process.env[variable] = previous
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
