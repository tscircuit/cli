import path from "node:path"
import fs from "node:fs"

/**
 * Gets all dependency package names from a project's package.json
 */
export function getAllDependencyPackages(projectDir: string): Set<string> {
  const packageJsonPath = path.join(projectDir, "package.json")
  const allPackages = new Set<string>()

  if (!fs.existsSync(packageJsonPath)) {
    return allPackages
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
    const deps = packageJson.dependencies || {}

    for (const packageName of Object.keys(deps)) {
      allPackages.add(packageName)
    }
  } catch (error) {
    console.warn("Failed to parse package.json for dependencies:", error)
  }

  return allPackages
}
