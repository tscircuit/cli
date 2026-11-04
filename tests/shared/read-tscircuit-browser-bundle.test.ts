import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readTscircuitBrowserBundle } from "lib/shared/read-tscircuit-browser-bundle"

const roots: string[] = []
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  )
})

const installBundle = async (root: string, content: string) => {
  const pkg = join(root, "node_modules/tscircuit")
  await mkdir(join(pkg, "dist"), { recursive: true })
  await writeFile(
    join(pkg, "package.json"),
    JSON.stringify({
      name: "tscircuit",
      exports: { "./browser": "./dist/browser.js" },
    }),
  )
  await writeFile(join(pkg, "dist/browser.js"), content)
}

test("resolves the CLI runtime's browser bundle independently of a project bundle", async () => {
  const root = await mkdtemp(join(tmpdir(), "tsci-browser-bundle-"))
  roots.push(root)
  const runtime = join(root, "runtime")
  const project = join(root, "project")
  await installBundle(runtime, "RUNTIME_WITH_MATCHING_WORKER")
  await installBundle(project, "PROJECT_WITH_DIFFERENT_WORKER")
  const cliEntry = join(runtime, "node_modules/@tscircuit/cli/dist/cli/main.js")
  expect(readTscircuitBrowserBundle(cliEntry)).toBe(
    "RUNTIME_WITH_MATCHING_WORKER",
  )
  expect(readTscircuitBrowserBundle(join(project, "package.json"))).toBe(
    "PROJECT_WITH_DIFFERENT_WORKER",
  )
})

test("supports runtimes without a published browser bundle", async () => {
  const root = await mkdtemp(join(tmpdir(), "tsci-browser-bundle-"))
  roots.push(root)
  expect(readTscircuitBrowserBundle(join(root, "package.json"))).toBeUndefined()
})
