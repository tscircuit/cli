import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Find the project root directory (where package.json exists or should be created)
 */
export function findProjectRoot(): string {
  let projectRoot = process.cwd()
  let foundPackageJson = false

  while (projectRoot !== path.parse(projectRoot).root) {
    if (fs.existsSync(path.join(projectRoot, "package.json"))) {
      foundPackageJson = true
      break
    }
    const parent = path.dirname(projectRoot)
    if (parent === projectRoot) break
    projectRoot = parent
  }

  // If we didn't find a package.json, use current directory
  if (!foundPackageJson) {
    projectRoot = process.cwd()
  }

  return projectRoot
}
