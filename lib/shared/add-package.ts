import * as fs from "node:fs"
import * as path from "node:path"
import { execSync } from "node:child_process"
import { getPackageManager } from "./get-package-manager"

/**
 * Normalizes a tscircuit component path to an npm package name.
 * @param componentPath - The component identifier (e.g., author/name, @tsci/author.name)
 * @returns The normalized npm package name.
 */
export function normalizePackageNameToNpm(componentPath: string): string {
  if (componentPath.startsWith("@tscircuit/")) {
    return componentPath
  } else if (componentPath.startsWith("@tsci/")) {
    return componentPath
  } else {
    const match = componentPath.match(/^([^/.]+)[/.](.+)$/)
    if (!match) {
      throw new Error(
        "Invalid component path. Use format: author/component-name, author.component-name, @tscircuit/package-name, or @tsci/author.component-name",
      )
    }
    const [, author, componentName] = match
    return `@tsci/${author}.${componentName}`
  }
}

/**
 * Installs a tscircuit component package.
 * Handles different package name formats, ensures .npmrc is configured,
 * and uses the appropriate package manager.
 *
 * @param componentPath - The component identifier (e.g., author/name, @tsci/author.name)
 * @param projectDir - The root directory of the project (defaults to process.cwd())
 */
export async function addPackage(
  componentPath: string,
  projectDir: string = process.cwd(),
) {
  const packageName = normalizePackageNameToNpm(componentPath)

  console.log(`Adding ${packageName}...`)

  // Ensure .npmrc exists with the correct registry
  const npmrcPath = path.join(projectDir, ".npmrc")
  const npmrcContent = fs.existsSync(npmrcPath)
    ? fs.readFileSync(npmrcPath, "utf-8")
    : ""

  if (!npmrcContent.includes("@tsci:registry=https://npm.tscircuit.com")) {
    fs.writeFileSync(
      npmrcPath,
      `${npmrcContent}\n@tsci:registry=https://npm.tscircuit.com\n`,
    )
    console.log("Updated .npmrc with tscircuit registry")
  }

  const isTestMode = process.env.TSCI_TEST_MODE === "true"
  if (isTestMode) {
    const pkgJsonPath = path.join(projectDir, "package.json")
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"))
    pkgJson.dependencies = pkgJson.dependencies || {}
    pkgJson.dependencies[packageName] = "^1.0.0" // Use a dummy version
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
    console.log(`Added ${packageName} successfully.`)
    return
  }

  // Install the package using the detected package manager
  const packageManager = getPackageManager()
  try {
    packageManager.install({ name: packageName, cwd: projectDir })
    console.log(`Added ${packageName} successfully.`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to add ${packageName}:`, errorMessage)
    // Re-throw the error so the caller can handle it
    throw new Error(`Failed to add ${packageName}: ${errorMessage}`)
  }
}
