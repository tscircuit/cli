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

test("installed core and autorouter follow the tscircuit dependency contract", () => {
  const tscircuitEntry = resolve("tscircuit", import.meta.url)
  const tscircuitPackage = readPackage(tscircuitEntry)
  for (const name of Object.keys(tscircuitPackage.dependencies)) {
    expect(cliPackage.devDependencies).not.toHaveProperty(name)
    expect(cliPackage.peerDependencies).not.toHaveProperty(name)
    expect(cliPackage.overrides).not.toHaveProperty(name)
  }
  const coreEntry = resolve("@tscircuit/core", tscircuitEntry)
  const routerEntry = resolve("@tscircuit/capacity-autorouter", tscircuitEntry)

  for (const [name, entry] of [
    ["@tscircuit/core", coreEntry],
    ["@tscircuit/capacity-autorouter", routerEntry],
  ]) {
    expect(
      satisfies(
        readPackage(entry).version,
        tscircuitPackage.dependencies[name],
      ),
    ).toBe(true)
    expect(cliPackage.overrides).not.toHaveProperty(name)
    expect(cliPackage.devDependencies).not.toHaveProperty(name)
  }
  expect(resolve("@tscircuit/capacity-autorouter", coreEntry)).toBe(routerEntry)
})
