import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { getCliVersion, resolveCliVersionFromDisk } from "lib/get-cli-version"
import { getVersionInfo } from "lib/getVersion"
import pkg from "../../package.json"

test("resolveCliVersionFromDisk finds the enclosing @tscircuit/cli package.json", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-cli-version-"))
  const nestedDistDir = path.join(tempRoot, "dist", "cli")

  fs.mkdirSync(nestedDistDir, { recursive: true })
  fs.writeFileSync(
    path.join(tempRoot, "package.json"),
    JSON.stringify({ name: "@tscircuit/cli", version: "0.1.2021" }),
  )

  expect(resolveCliVersionFromDisk(nestedDistDir)).toBe("0.1.2021")
})

test("getCliVersion ignores unrelated package.json files and uses fallback when missing", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-cli-fallback-"))
  const nestedDir = path.join(tempRoot, "nested", "dir")

  fs.mkdirSync(nestedDir, { recursive: true })
  fs.writeFileSync(
    path.join(tempRoot, "package.json"),
    JSON.stringify({ name: "some-other-package", version: "9.9.9" }),
  )

  expect(getCliVersion(nestedDir, "0.1.2020")).toBe("0.1.2020")
})

test("getVersionInfo reports the on-disk @tscircuit/cli package.json version", () => {
  const versions = getVersionInfo(() => undefined)
  expect(versions.cliVersion).toBe(pkg.version)
})
