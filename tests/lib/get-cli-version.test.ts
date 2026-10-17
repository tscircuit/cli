import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { resolveCliVersionFromModuleUrl } from "lib/get-cli-version"
import { getVersionInfo } from "lib/getVersion"
import { currentCliVersion } from "lib/shared/check-for-cli-update"
import pkg from "../../package.json"

test("resolveCliVersionFromModuleUrl reads the nearest @tscircuit/cli package.json from disk", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-version-test-"))
  try {
    const packageRoot = path.join(tempDir, "node_modules", "@tscircuit", "cli")
    const distDir = path.join(packageRoot, "dist")

    fs.mkdirSync(distDir, { recursive: true })
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name: "@tscircuit/cli", version: "0.1.2020" }),
    )
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "unrelated-app", version: "9.9.9" }),
    )

    const fakeBundleUrl = pathToFileURL(path.join(distDir, "main.js")).href

    expect(resolveCliVersionFromModuleUrl(fakeBundleUrl, "0.1.2019")).toBe(
      "0.1.2020",
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("resolveCliVersionFromModuleUrl falls back when no @tscircuit/cli manifest exists", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-version-test-"))
  try {
    const nestedDir = path.join(tempDir, "nested", "dist")

    fs.mkdirSync(nestedDir, { recursive: true })
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "unrelated-app", version: "9.9.9" }),
    )

    const fakeBundleUrl = pathToFileURL(path.join(nestedDir, "main.js")).href

    expect(resolveCliVersionFromModuleUrl(fakeBundleUrl, "0.1.2020")).toBe(
      "0.1.2020",
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("currentCliVersion matches getVersionInfo().cliVersion and package.json version", () => {
  expect(currentCliVersion()).toBe(pkg.version)
  expect(getVersionInfo().cliVersion).toBe(pkg.version)
})
