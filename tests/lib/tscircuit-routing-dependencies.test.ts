import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { resolve } from "import-meta-resolve"
import { satisfies } from "semver"
import cliPackage from "../../package.json"

type PackageManifest = {
  name: string
  version: string
  dependencies: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

function readPackage(entryUrl: string): PackageManifest {
  let directory = path.dirname(fileURLToPath(entryUrl))
  while (directory !== path.dirname(directory)) {
    const manifest = path.join(directory, "package.json")
    if (fs.existsSync(manifest)) {
      return JSON.parse(fs.readFileSync(manifest, "utf8"))
    }
    directory = path.dirname(directory)
  }
  throw new Error(`No package.json found for ${entryUrl}`)
}

// Coordinated cross-repository reviews can pin immutable package previews.
// Require the same root override so tscircuit and all Core peers share one
// instance. Normal npm dependencies still follow tscircuit's ownership rules.
const isCoordinatedPreview = (name: string) => {
  const declared = (cliPackage.devDependencies as Record<string, string>)[name]
  if (!declared?.startsWith("https://pkg.pr.new/")) return false
  expect(declared).toMatch(/@[a-f0-9]{40}$/)
  expect(
    declared
      .slice("https://pkg.pr.new/".length)
      .split("@")
      .slice(0, -1)
      .join("@"),
  ).toBe(name)
  expect((cliPackage.overrides as Record<string, string>)[name]).toBe(declared)
  return true
}

test("installed core and autorouter follow the tscircuit dependency contract", () => {
  const tscircuitEntry = resolve("tscircuit", import.meta.url)
  const tscircuitPackage = readPackage(tscircuitEntry)
  // The public tscircuit package includes the CLI. Developing the CLI against
  // libonly breaks that installation cycle while preserving its library deps.
  expect(cliPackage.devDependencies.tscircuit).toEndWith("-libonly")
  expect(tscircuitPackage.version).toEndWith("-libonly")
  expect(tscircuitPackage.dependencies).not.toHaveProperty("@tscircuit/cli")
  expect(tscircuitPackage.optionalDependencies ?? {}).not.toHaveProperty(
    "@tscircuit/cli",
  )
  for (const name of Object.keys(tscircuitPackage.dependencies)) {
    // Bun can hoist a helper’s private dependency ahead of tscircuit’s version.
    // This development-only mirror must track tscircuit's range exactly.
    if (isCoordinatedPreview(name)) {
      // The preview is the reviewed dependency rather than a shadow npm copy.
    } else if (
      name === "@tscircuit/footprinter" ||
      name === "poppygl" ||
      name === "circuit-json"
    ) {
      expect(cliPackage.devDependencies[name]).toBe(
        tscircuitPackage.dependencies[name],
      )
    } else {
      expect(cliPackage.devDependencies).not.toHaveProperty(name)
    }
    expect(cliPackage.peerDependencies).not.toHaveProperty(name)
    if (!isCoordinatedPreview(name))
      expect(cliPackage.overrides).not.toHaveProperty(name)
  }
  const coreEntry = resolve("@tscircuit/core", tscircuitEntry)
  const routerEntry = resolve("@tscircuit/capacity-autorouter", tscircuitEntry)

  for (const [name, entry] of [
    ["@tscircuit/core", coreEntry],
    ["@tscircuit/capacity-autorouter", routerEntry],
    ["@tscircuit/props", resolve("@tscircuit/props", tscircuitEntry)],
    ["circuit-json", resolve("circuit-json", tscircuitEntry)],
  ]) {
    if (!isCoordinatedPreview(name))
      expect(
        satisfies(
          readPackage(entry).version,
          tscircuitPackage.dependencies[name],
        ),
      ).toBe(true)
    if (!isCoordinatedPreview(name))
      expect(cliPackage.overrides).not.toHaveProperty(name)
  }
  for (const name of Object.keys(
    readPackage(coreEntry).peerDependencies ?? {},
  )) {
    if (!(name in tscircuitPackage.dependencies)) continue
    expect(resolve(name, coreEntry)).toBe(resolve(name, tscircuitEntry))
  }
})
