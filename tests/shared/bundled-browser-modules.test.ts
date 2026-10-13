import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import { copyBundledBrowserModules } from "lib/shared/bundled-browser-modules"

test("copying a new bundle set removes retired versions from a previous site build", () => {
  const directory = temporaryDirectory()
  globalThis.deferredCleanupFns.push(async () => {
    fs.rmSync(directory, { recursive: true, force: true })
  })
  const source = path.join(directory, "source")
  const output = path.join(directory, "site")
  const retired = path.join(output, "jscdn", "retired-version")
  fs.mkdirSync(source, { recursive: true })
  fs.mkdirSync(retired, { recursive: true })
  fs.writeFileSync(path.join(retired, "+esm"), "old")
  fs.writeFileSync(path.join(source, "manifest.json"), "{}")
  fs.writeFileSync(path.join(source, "+esm"), "new")

  copyBundledBrowserModules(output, source)
  expect(fs.existsSync(retired)).toBe(false)
  expect(fs.readFileSync(path.join(output, "jscdn", "+esm"), "utf8")).toBe(
    "new",
  )
  // Building inside the CLI checkout must not delete its own asset source.
  copyBundledBrowserModules(output, path.join(output, "jscdn"))
  expect(fs.existsSync(path.join(output, "jscdn", "manifest.json"))).toBe(true)
})

test("missing packaged assets fail before replacing an existing site bundle set", () => {
  const directory = temporaryDirectory()
  globalThis.deferredCleanupFns.push(async () => {
    fs.rmSync(directory, { recursive: true, force: true })
  })
  const sentinel = path.join(directory, "jscdn", "+esm")
  fs.mkdirSync(path.dirname(sentinel), { recursive: true })
  fs.writeFileSync(sentinel, "existing")
  expect(() =>
    copyBundledBrowserModules(directory, path.join(directory, "missing")),
  ).toThrow("Bundled browser modules are missing")
  expect(fs.readFileSync(sentinel, "utf8")).toBe("existing")
})
