import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import pkg from "../../package.json"
import {
  getCliVersion,
  resolveCliVersionFromStartDir,
} from "lib/get-cli-version"

test("resolveCliVersionFromStartDir reads @tscircuit/cli version from disk in dist/cli layout", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-cli-version-"))
  try {
    const cliRoot = path.join(tempRoot, "node_modules", "@tscircuit", "cli")
    const distCliDir = path.join(cliRoot, "dist", "cli")
    fs.mkdirSync(distCliDir, { recursive: true })
    fs.writeFileSync(
      path.join(cliRoot, "package.json"),
      JSON.stringify({ name: "@tscircuit/cli", version: "0.1.2500" }),
    )

    const resolved = resolveCliVersionFromStartDir(distCliDir, "0.1.2498")
    expect(resolved).toBe("0.1.2500")
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("resolveCliVersionFromStartDir ignores unrelated package.json files and uses fallback", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-other-pkg-"))
  try {
    const nestedDir = path.join(tempRoot, "project", "src")
    fs.mkdirSync(nestedDir, { recursive: true })
    fs.writeFileSync(
      path.join(tempRoot, "project", "package.json"),
      JSON.stringify({ name: "my-board", version: "9.9.9" }),
    )

    const resolved = resolveCliVersionFromStartDir(nestedDir, "0.1.2460")
    expect(resolved).toBe("0.1.2460")
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("getCliVersion returns the exact version in package.json without adding a patch bump", () => {
  expect(getCliVersion()).toBe(pkg.version)
})
