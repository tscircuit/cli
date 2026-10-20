import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { createHttpServer } from "lib/server/createHttpServer"

test("live tabs endpoint observes updates, removal and strict config errors without exposing unrelated settings", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "tsci-live-tabs-"))
  const configPath = path.join(projectDir, "tscircuit.config.json")
  const { server } = await createHttpServer({ port: 0, projectDir })
  try {
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Missing port")
    const baseUrl = `http://127.0.0.1:${address.port}`
    const url = `${baseUrl}/api/extra_runframe_tabs/list`
    const tab = {
      tabName: "External viewer",
      iframeUrl: "https://example.com/#before",
      mainComponentPath: "index.tsx",
    }
    await writeFile(
      configPath,
      JSON.stringify({
        extraRunFrameTabs: [tab],
        prebuildCommand: "private-command",
      }),
    )
    const initial = await fetch(url)
    expect(initial.headers.get("cache-control")).toBe("no-store")
    expect(await initial.json()).toEqual({
      tabs: [
        {
          tab_name: tab.tabName,
          iframe_url: tab.iframeUrl,
          main_component_path: "index.tsx",
        },
      ],
    })
    await writeFile(
      configPath,
      JSON.stringify({
        extraRunFrameTabs: [
          { ...tab, iframeUrl: "https://example.com/#after" },
        ],
      }),
    )
    expect(
      (await (await fetch(url, { method: "POST" })).json()).tabs[0].iframe_url,
    ).toBe("https://example.com/#after")
    await writeFile(configPath, "{")
    const invalid = await fetch(url)
    expect(invalid.status).toBe(500)
    expect((await invalid.json()).error.error_code).toBe(
      "external_tabs_config_invalid",
    )
    await writeFile(
      configPath,
      JSON.stringify({
        extraRunFrameTabs: [{ ...tab, iframeUrl: "javascript:alert(1)" }],
      }),
    )
    expect((await fetch(url)).status).toBe(500)
    await writeFile(configPath, "{}")
    expect(await (await fetch(url)).json()).toEqual({ tabs: [] })
    await rm(configPath)
    expect(await (await fetch(url)).json()).toEqual({ tabs: [] })
    const unsupported = await fetch(url, { method: "DELETE" })
    expect(unsupported.status).toBe(405)
    expect(unsupported.headers.get("allow")).toBe("GET, POST")
    const html = await (await fetch(baseUrl)).text()
    expect(html).toContain('<script src="/extra-runframe-tabs.js" defer>')
    const script = await fetch(`${baseUrl}/extra-runframe-tabs.js`)
    expect(script.headers.get("content-type")).toContain(
      "application/javascript",
    )
    expect(await script.text()).toContain(
      "tscircuit:extra-runframe-tabs-change",
    )
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
    await rm(projectDir, { recursive: true })
  }
})
