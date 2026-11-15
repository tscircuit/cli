import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { importFromUserLand } from "lib/shared/importFromUserLand"
import { importProjectCircuitLibrary } from "lib/shared/import-project-circuit-library"

test("project tscircuit keeps its own nested routing dependencies", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "tsci-user-deps-"))
  const tscircuit = path.join(project, "node_modules/tscircuit")
  const packages = [
    [tscircuit, "tscircuit", 'export { routerVersion } from "@tscircuit/core"'],
    [
      path.join(tscircuit, "node_modules/@tscircuit/core"),
      "@tscircuit/core",
      'export { routerVersion } from "@tscircuit/capacity-autorouter"',
    ],
    [
      path.join(tscircuit, "node_modules/@tscircuit/capacity-autorouter"),
      "@tscircuit/capacity-autorouter",
      'export const routerVersion = "project-tscircuit-router"',
    ],
    [
      path.join(project, "node_modules/@tscircuit/capacity-autorouter"),
      "@tscircuit/capacity-autorouter",
      'export const routerVersion = "unrelated-hoisted-router"',
    ],
  ]
  try {
    for (const [directory, name, source] of packages) {
      await fs.mkdir(directory, { recursive: true })
      await fs.writeFile(
        path.join(directory, "package.json"),
        JSON.stringify({ name, type: "module", exports: "./index.js" }),
      )
      await fs.writeFile(path.join(directory, "index.js"), source)
    }
    const loaded = await importFromUserLand("tscircuit", project)
    expect(loaded.routerVersion).toBe("project-tscircuit-router")
    expect((await importProjectCircuitLibrary(project)).routerVersion).toBe(
      "project-tscircuit-router",
    )
  } finally {
    await fs.rm(project, { recursive: true, force: true })
  }
})

test("a project without tscircuit uses CLI's own core", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "tsci-owned-core-"))
  try {
    const library = await importProjectCircuitLibrary(project)
    expect(library.RootCircuit).toBe(
      (await import("@tscircuit/core")).RootCircuit,
    )
  } finally {
    await fs.rm(project, { recursive: true, force: true })
  }
})

test("broken project tscircuit does not silently fall back to a different core", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "tsci-broken-core-"))
  try {
    const directory = path.join(project, "node_modules/tscircuit")
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ type: "module", exports: "./index.js" }),
    )
    await fs.writeFile(
      path.join(directory, "index.js"),
      'throw new Error("broken project circuit library")',
    )
    await expect(importProjectCircuitLibrary(project)).rejects.toThrow(
      "broken project circuit library",
    )
  } finally {
    await fs.rm(project, { recursive: true, force: true })
  }
})
