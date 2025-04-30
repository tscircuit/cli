import * as fs from "node:fs"
import * as path from "node:path"
import { execSync } from "node:child_process"
import { detectPackageManager } from "./detect-pkg-manager"

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
  let packageName: string

  // Handle different input formats
  if (componentPath.startsWith("@tscircuit/")) {
    // Direct npm package with @tscircuit scope
    packageName = componentPath
  } else if (componentPath.startsWith("@tsci/")) {
    // Direct tscircuit registry package
    packageName = componentPath
  } else {
    // Parse author/component format
    const match = componentPath.match(/^([^/.]+)[/.](.+)$/)
    if (!match) {
      throw new Error(
        "Invalid component path. Use format: author/component-name, author.component-name, @tscircuit/package-name, or @tsci/author.component-name",
      )
    }

    const [, author, componentName] = match
    packageName = `@tsci/${author}.${componentName}`
  }

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
  const packageManager = detectPackageManager(projectDir) // Pass projectDir
  let installCommand: string

  if (packageManager === "yarn") {
    installCommand = `yarn add ${packageName}`
  } else if (packageManager === "pnpm") {
    installCommand = `pnpm add ${packageName}`
  } else if (packageManager === "bun") {
    // Explicitly set registry for @tsci packages with bun
    if (packageName.startsWith("@tsci/")) {
      installCommand = `bun add ${packageName} --registry https://npm.tscircuit.com`
    } else {
      installCommand = `bun add ${packageName}`
    }
  } else {
    // Default to npm
    installCommand = `npm install ${packageName}`
  }

  try {
    // Run the command in the specified project directory
    execSync(installCommand, { stdio: "pipe", cwd: projectDir })
    console.log(`Added ${packageName} successfully.`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to add ${packageName}:`, errorMessage)
    // Re-throw the error so the caller can handle it
    throw new Error(`Failed to add ${packageName}: ${errorMessage}`)
  }
}
