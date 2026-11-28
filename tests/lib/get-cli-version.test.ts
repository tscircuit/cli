import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { getCliVersion } from "lib/get-cli-version"
import { currentCliVersion } from "lib/shared/check-for-cli-update"
import semver from "semver"
import pkg from "../../package.json"

test("getCliVersion walks upward to find @tscircuit/cli package.json and reflects post-build updates", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "tsci-cli-ver-"))
  try {
    const nestedCliDir = join(tempRoot, "dist", "cli")
    mkdirSync(nestedCliDir, { recursive: true })
    writeFileSync(
      join(tempRoot, "package.json"),
      JSON.stringify({ name: "@tscircuit/cli", version: "0.1.2021" }),
    )
    writeFileSync(
      join(tempRoot, "dist", "package.json"),
      JSON.stringify({ name: "nested-fixture", version: "9.9.9" }),
    )

    expect(getCliVersion(nestedCliDir)).toBe("0.1.2021")

    writeFileSync(
      join(tempRoot, "package.json"),
      JSON.stringify({ name: "@tscircuit/cli", version: "0.1.9999" }),
    )

    expect(getCliVersion(nestedCliDir)).toBe("0.1.9999")
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("built getCliVersion bundle reads runtime package.json version when manifest changes post-build", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "tsci-cli-bundle-ver-"))
  try {
    const bundledDir = join(tempRoot, "dist", "lib")
    mkdirSync(bundledDir, { recursive: true })
    writeFileSync(
      join(tempRoot, "package.json"),
      JSON.stringify({ name: "@tscircuit/cli", version: "0.1.2021" }),
    )

    const buildResult = await Bun.build({
      entrypoints: [
        fileURLToPath(new URL("../../lib/get-cli-version.ts", import.meta.url)),
      ],
      outdir: bundledDir,
      target: "node",
    })
    expect(buildResult.success).toBe(true)

    const builtModule = await import(
      `${pathToFileURL(join(bundledDir, "get-cli-version.js")).href}?t=${Date.now()}`
    )
    expect(builtModule.getCliVersion()).toBe("0.1.2021")

    writeFileSync(
      join(tempRoot, "package.json"),
      JSON.stringify({ name: "@tscircuit/cli", version: "0.1.9999" }),
    )
    expect(builtModule.getCliVersion()).toBe("0.1.9999")
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("currentCliVersion matches installed package version without +1 patch skew", () => {
  expect(currentCliVersion()).toBe(pkg.version)
  expect(semver.gt(pkg.version, currentCliVersion())).toBe(false)
})
