import path from "node:path"
import fs from "node:fs"

/**
 * Finds the package directory in node_modules for a given package name.
 * Searches in the project's node_modules and parent directories for hoisted packages.
 */
export function findPackageDir({
  packageName,
  projectDir,
  searchFromDir,
}: {
  packageName: string
  projectDir: string
  searchFromDir?: string
}): string | undefined {
  const searchPaths: string[] = [
    path.join(projectDir, "node_modules", packageName),
  ]

  if (searchFromDir) {
    // Walk up the directory tree from searchFromDir to find node_modules
    let currentDir = path.dirname(searchFromDir)
    const projectDirNormalized = path.normalize(projectDir)

    while (currentDir.startsWith(projectDirNormalized)) {
      const candidatePath = path.join(currentDir, "node_modules", packageName)
      if (!searchPaths.includes(candidatePath)) {
        searchPaths.push(candidatePath)
      }

      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) break
      currentDir = parentDir
    }
  }

  for (const candidatePath of searchPaths) {
    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return undefined
}
