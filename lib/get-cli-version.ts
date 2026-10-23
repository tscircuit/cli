import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pkg from "../package.json"

type CliPackageManifest = {
  name?: string
  version?: string
}

const CLI_PACKAGE_NAME = "@tscircuit/cli"
const bundledPackageVersion = pkg.version

const readCliPackageVersion = (packageJsonPath: string): string | undefined => {
  try {
    const manifest = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8"),
    ) as CliPackageManifest

    if (
      manifest.name === CLI_PACKAGE_NAME &&
      typeof manifest.version === "string" &&
      manifest.version.trim().length > 0
    ) {
      return manifest.version
    }
  } catch {
    return undefined
  }

  return undefined
}

export const resolveCliVersionFromModuleUrl = (
  moduleUrl: string = import.meta.url,
  fallbackVersion: string = bundledPackageVersion,
): string => {
  try {
    let currentDir = path.dirname(fileURLToPath(moduleUrl))

    while (true) {
      const candidateVersion = readCliPackageVersion(
        path.join(currentDir, "package.json"),
      )
      if (candidateVersion) {
        return candidateVersion
      }

      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) {
        break
      }
      currentDir = parentDir
    }
  } catch {
    return fallbackVersion
  }

  return fallbackVersion
}

export const getCliVersion = (): string => resolveCliVersionFromModuleUrl()
