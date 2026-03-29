import { createRequire } from "node:module"
import pkg from "../package.json"
import semver from "semver"

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

const getCliVersion = () => semver.inc(pkg.version, "patch") ?? pkg.version

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
    return versions.cliVersion ?? versions.tscircuitVersion
  }

  return [
    `tscircuit: ${versions.tscircuitVersion ?? "not installed"}`,
    `@tscircuit/cli: ${versions.cliVersion}`,
    `@tscircuit/runframe: ${versions.runframeVersion ?? "not installed"}`,
    `@tscircuit/core: ${versions.coreVersion ?? "not installed"}`,
  ].join("\n")
}
