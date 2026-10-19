import { expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { createHttpServer } from "lib/server/createHttpServer"

test("dev reload observes extra tabs and recovers from a config read failure", async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "tsci-dev-tabs-"))
  const { server } = await createHttpServer({ port: 0, projectDir })
  try {
    const address = server.address()
    if (!address || typeof address === "string")
      throw new Error("Missing server port")
    const url = `http://localhost:${address.port}/`
    const configPath = path.join(projectDir, "tscircuit.config.json")
    const tabs = [
      { tabName: "Sysconfig", iframeUrl: "https://example.com/#content" },
    ]
    await writeFile(configPath, JSON.stringify({ extraRunFrameTabs: tabs }))
    const readTabs = async () => {
      const response = await fetch(url)
      expect(response.status).toBe(200)
      const html = await response.text()
      const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
      const window: Record<string, unknown> = {}
      runInNewContext(script!, { window })
      return window.TSCIRCUIT_EXTRA_RUNFRAME_TABS
    }
    expect(await readTabs()).toEqual(tabs)
    await writeFile(configPath, "{}")
    expect(await readTabs()).toEqual([])

    // The environment loader cannot read a directory as an environment file.
    await mkdir(path.join(projectDir, ".env"))
    const failed = await fetch(url)
    expect(failed.status).toBe(500)
    expect(failed.headers.get("content-type")).toContain("text/plain")
    expect(await failed.text()).toContain(
      "Unable to load project configuration",
    )
    await rm(path.join(projectDir, ".env"), { recursive: true })
    await writeFile(configPath, JSON.stringify({ extraRunFrameTabs: tabs }))
    expect(await readTabs()).toEqual(tabs)
    await rm(configPath)
    expect(await readTabs()).toEqual([])
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
    await rm(projectDir, { recursive: true })
  }
})
