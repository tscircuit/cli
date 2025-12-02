import path from "node:path"
import fs from "node:fs"

/**
 * Finds the package directory from a resolved file path by walking up
 * and looking for a package.json with a matching name.
 */
export function findPackageDirFromResolvedFile(
  resolvedFile: string,
  packageName: string,
): string | undefined {
  let packageDir = path.dirname(resolvedFile)

  while (packageDir.includes("node_modules")) {
    const packageJsonPath = path.join(packageDir, "package.json")
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
        if (pkgJson.name === packageName) {
          return packageDir
        }
      } catch {
        // Continue searching
      }
    }

    const nextParentDir = path.dirname(packageDir)
    if (nextParentDir === packageDir) break
    packageDir = nextParentDir
  }

  return undefined
}
