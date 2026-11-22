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

/**
 * Resolve the version of the actually-installed @tscircuit/cli package at
 * runtime.
 *
 * The bundled `package.json` version is inlined into `dist/cli/main.js` at
 * build time. Because the release pipeline runs `bun run build` *before*
 * `pver release` bumps `package.json`, the inlined value can lag behind the
 * version that is actually published and installed on disk. Reading the
 * resolved manifest keeps both the update check and `--version` output honest
 * and avoids a phantom "new version available" loop. See #4628.
 */
export const resolveInstalledCliVersion = (): string | undefined =>
  resolvePackageVersionFromNodeModules("@tscircuit/cli")

const getCliVersion = () => resolveInstalledCliVersion() ?? pkg.version

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
