import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import semver from "semver"
import pkg from "../package.json"

const require = createRequire(import.meta.url)

type VersionResolver = (packageName: string) => string | undefined

const resolvePackageVersionFromNodeModules: VersionResolver = (packageName) => {
  try {
    const packageJson = require(`${packageName}/package.json`) as {
      version?: string
    }
    return packageJson.version
  } catch {
    return undefined
  }
}

export const getCliVersion = (moduleUrl: string = import.meta.url): string => {
  try {
    let dir = dirname(fileURLToPath(moduleUrl))
    for (let depth = 0; depth < 6; depth++) {
      try {
        const manifest = JSON.parse(
          readFileSync(join(dir, "package.json"), "utf8"),
        ) as { name?: unknown; version?: unknown }
        if (
          manifest.name === "@tscircuit/cli" &&
          typeof manifest.version === "string" &&
          semver.valid(manifest.version) !== null
        ) {
          return manifest.version
        }
      } catch {}

      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  } catch {}

  const resolvedFromNodeModules =
    resolvePackageVersionFromNodeModules("@tscircuit/cli")
  if (
    typeof resolvedFromNodeModules === "string" &&
    semver.valid(resolvedFromNodeModules) !== null
  ) {
    return resolvedFromNodeModules
  }

  return pkg.version
}

type GlobalWithTscircuitVersion = typeof globalThis & {
  TSCIRCUIT_VERSION?: string
}

export const getVersionInfo = (
  resolvePackageVersion: VersionResolver = resolvePackageVersionFromNodeModules,
) => {
  const cliVersion = getCliVersion()
  const tscircuitVersion =
    (globalThis as GlobalWithTscircuitVersion).TSCIRCUIT_VERSION ??
    resolvePackageVersion("tscircuit")

  return {
    tscircuitVersion,
    cliVersion,
    runframeVersion: resolvePackageVersion("@tscircuit/runframe"),
    coreVersion: resolvePackageVersion("@tscircuit/core"),
  }
}

export const getVersion = ({ verbose = false }: { verbose?: boolean } = {}) => {
  const versions = getVersionInfo()

  if (!verbose) {
    return versions.tscircuitVersion ?? versions.cliVersion
  }

  return [
    `tscircuit: ${versions.tscircuitVersion ?? "not installed"}`,
    `@tscircuit/cli: ${versions.cliVersion}`,
    `@tscircuit/runframe: ${versions.runframeVersion ?? "not installed"}`,
    `@tscircuit/core: ${versions.coreVersion ?? "not installed"}`,
  ].join("\n")
}
