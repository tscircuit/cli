import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { loadRuntimeProjectConfig } from "lib/project-config"
import { tabs } from "../fixtures/extra-runframe-tabs"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true })),
  )
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
