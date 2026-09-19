import * as fs from "node:fs"
import { createRequire } from "node:module"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
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

export const getCliVersion = () => {
  // 1. Try to resolve via node module resolution (e.g. when installed in node_modules)
  const resolvedFromNode =
    resolvePackageVersionFromNodeModules("@tscircuit/cli")
  if (resolvedFromNode) {
    return resolvedFromNode
  }

  // 2. Try walking up from the current file location to find on-disk package.json
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url))
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, "package.json")
      if (fs.existsSync(candidate)) {
        try {
          const content = JSON.parse(fs.readFileSync(candidate, "utf8"))
          if (content.name === "@tscircuit/cli" && content.version) {
            return content.version
          }
        } catch {}
      }
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  } catch {}

  // 3. Fall back to bundled package.json
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
