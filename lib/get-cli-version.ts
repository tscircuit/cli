import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pkg from "../package.json"

type PackageManifest = {
  name?: string
  version?: string
}

const getDefaultSearchStartDir = () =>
  path.dirname(fileURLToPath(import.meta.url))

export const resolveCliVersionFromDisk = (
  startDir = getDefaultSearchStartDir(),
): string | undefined => {
  let currentDir = path.resolve(startDir)

  while (true) {
    const packageJsonPath = path.join(currentDir, "package.json")

    try {
      const manifest = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf8"),
      ) as PackageManifest

      if (
        manifest.name === "@tscircuit/cli" &&
        typeof manifest.version === "string" &&
        manifest.version.length > 0
      ) {
        return manifest.version
      }
    } catch {
      // Ignore missing or unreadable package.json files while walking upward.
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      return undefined
    }
    currentDir = parentDir
  }
}

export const getCliVersion = (
  startDir = getDefaultSearchStartDir(),
  fallbackVersion = pkg.version,
) => resolveCliVersionFromDisk(startDir) ?? fallbackVersion
