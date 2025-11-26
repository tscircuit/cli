import { getPackageManager } from "./get-package-manager"
import { normalizePackageNameToNpm } from "./add-package"
import path from "node:path"
import fs from "node:fs"
/**
 * Removes a tscircuit component package.
 * Handles different package name formats and uses the appropriate package manager.
 *
 * @param componentPath - The component identifier (e.g., author/name, @tsci/author.name)
 * @param projectDir - The root directory of the project (defaults to process.cwd())
 */
export async function removePackage(
  componentPath: string,
  projectDir: string = process.cwd(),
) {
  const normalizedName = normalizePackageNameToNpm(componentPath)
  const packageName = normalizedName || componentPath

  console.log(`Removing ${packageName}...`)

  const packageManager = getPackageManager()
  try {
    packageManager.uninstall({ name: packageName, cwd: projectDir })
    console.log(`Removed ${packageName} successfully.`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    // If the error is about the package not being found, print a friendly message
    if (
      errorMessage.includes("is not in dependencies") ||
      errorMessage.includes("not present in package.json") ||
      errorMessage.includes("No such package") ||
      errorMessage.includes("not found in dependencies")
    ) {
      console.log(`${packageName} is not a dependency.`)
      return
    }
    console.error(`Failed to remove ${packageName}:`, errorMessage)
    // Re-throw the error so the caller can handle it
    throw new Error(`Failed to remove ${packageName}: ${errorMessage}`)
  }
}
