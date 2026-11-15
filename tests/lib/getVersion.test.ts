import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { getCliVersion, getVersion, getVersionInfo } from "lib/getVersion"
import pkg from "../../package.json"

type GlobalWithTscircuitVersion = typeof globalThis & {
  TSCIRCUIT_VERSION?: string
}

const tempDirs: string[] = []

afterEach(() => {
  delete (globalThis as GlobalWithTscircuitVersion).TSCIRCUIT_VERSION
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("getVersion prefers global TSCIRCUIT_VERSION when available", () => {
  ;(globalThis as GlobalWithTscircuitVersion).TSCIRCUIT_VERSION = "9.9.9"

  const output = getVersion()

  expect(output).toBe("9.9.9")
})

test("getVersionInfo falls back to package resolver when global version is absent", () => {
  const versions = getVersionInfo((packageName) => {
    if (packageName === "tscircuit") return "1.2.3"
    if (packageName === "@tscircuit/runframe") return "4.5.6"
    if (packageName === "@tscircuit/core") return "7.8.9"
    return undefined
  })

  expect(versions.tscircuitVersion).toBe("1.2.3")
  expect(versions.runframeVersion).toBe("4.5.6")
  expect(versions.coreVersion).toBe("7.8.9")
  expect(versions.cliVersion).toBe(pkg.version)
})

test("getVersion verbose output prints all requested packages", () => {
  ;(globalThis as GlobalWithTscircuitVersion).TSCIRCUIT_VERSION = "3.2.1"

  const output = getVersion({ verbose: true })

  expect(output).toContain("tscircuit: 3.2.1")
  expect(output).toContain(`@tscircuit/cli: ${pkg.version}`)
  expect(output).toContain("@tscircuit/runframe:")
  expect(output).toContain("@tscircuit/core:")
})

test("getCliVersion reads the installed on-disk @tscircuit/cli manifest rather than guessing a patch bump", () => {
  const root = mkdtempSync(join(tmpdir(), "tsci-cli-version-"))
  tempDirs.push(root)

  const distCliDir = join(root, "dist", "cli")
  mkdirSync(distCliDir, { recursive: true })

  // Simulate a published package where pver bumped package.json after build,
  // plus an unrelated nested package.json in dist/cli that must be ignored.
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "@tscircuit/cli", version: "0.1.2021" }),
  )
  writeFileSync(
    join(distCliDir, "package.json"),
    JSON.stringify({ name: "unrelated-package", version: "9.9.9" }),
  )

  const bundledMainUrl = pathToFileURL(join(distCliDir, "main.js")).href
  expect(getCliVersion(bundledMainUrl)).toBe("0.1.2021")
})
