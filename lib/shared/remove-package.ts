import * as fs from "node:fs"
import * as path from "node:path"
import { execSync } from "node:child_process"
import { detectPackageManager } from "./detect-pkg-manager"
import { normalizePackageNameToNpm } from "./add-package"

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
  const packageName = normalizePackageNameToNpm(componentPath)

  console.log(`Removing ${packageName}...`)

  const isTestMode = process.env.TSCI_TEST_MODE === "true"
  if (isTestMode) {
    const pkgJsonPath = path.join(projectDir, "package.json")
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"))
    pkgJson.dependencies = pkgJson.dependencies || {}
    if (pkgJson.dependencies[packageName]) {
      delete pkgJson.dependencies[packageName]
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
      console.log(`Removed ${packageName} successfully.`)
    } else {
      console.log(`${packageName} is not a dependency.`)
    }
    return
  }

  // Uninstall the package using the detected package manager
  const packageManager = detectPackageManager()
  let uninstallCommand: string

  if (packageManager === "yarn") {
    uninstallCommand = `yarn remove ${packageName}`
  } else if (packageManager === "pnpm") {
    uninstallCommand = `pnpm remove ${packageName}`
  } else if (packageManager === "bun") {
    uninstallCommand = `bun remove ${packageName}`
  } else {
    // Default to npm
    uninstallCommand = `npm uninstall ${packageName}`
  }

  try {
    execSync(uninstallCommand, { stdio: "pipe", cwd: projectDir })
    console.log(`Removed ${packageName} successfully.`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to remove ${packageName}:`, errorMessage)
    throw new Error(`Failed to remove ${packageName}: ${errorMessage}`)
  }
}
