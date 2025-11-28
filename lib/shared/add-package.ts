import * as fs from "node:fs"
import * as path from "node:path"
import { prompts } from "lib/utils/prompts"
import { getPackageManager } from "./get-package-manager"
import { resolveTarballUrlFromRegistry } from "./resolve-tarball-url-from-registry"
import { detectAndSetupKicadLibrary } from "./detect-and-setup-kicad-library"

/**
 * Checks if a package spec is a tscircuit component format and normalizes it.
 * Returns null if it's not a tscircuit component format (e.g., regular npm package, URL, etc.)
 * @param packageSpec - The package specifier
 * @returns The normalized @tsci scoped package name or null if not a tscircuit component
 */
export function normalizeTscircuitPackageName(
  packageSpec: string,
): string | null {
  // Already a tscircuit scoped package
  if (
    packageSpec.startsWith("@tscircuit/") ||
    packageSpec.startsWith("@tsci/")
  ) {
    return packageSpec
  }

  // Check for URLs or git repos - these are not tscircuit components
  if (
    packageSpec.startsWith("http://") ||
    packageSpec.startsWith("https://") ||
    packageSpec.startsWith("git+") ||
    packageSpec.startsWith("git://")
  ) {
    return null
  }

  // Check for npm package with version (e.g., lodash@4.17.21) - not a tscircuit component
  if (packageSpec.includes("@") && !packageSpec.startsWith("@")) {
    return null
  }

  // Check for scoped packages that aren't tscircuit
  if (
    packageSpec.startsWith("@") &&
    !packageSpec.startsWith("@tsci/") &&
    !packageSpec.startsWith("@tscircuit/")
  ) {
    return null
  }

  // Try to match author/component or author.component format
  const match = packageSpec.match(/^([^/.@]+)[/.]([^/.@]+)$/)
  if (match) {
    const [, author, componentName] = match
    return `@tsci/${author}.${componentName}`
  }

  // Anything else is treated as a regular package name
  return null
}

/**
 * Adds a package to the project (works like bun add).
 * Detects tscircuit component formats and handles @tsci registry setup.
 * All other package specs are passed directly to the package manager.
 *
 * @param packageSpec - Any package specifier (e.g., package-name, author/component, https://github.com/user/repo, package@version)
 * @param projectDir - The root directory of the project (defaults to process.cwd())
 */
export async function addPackage(
  packageSpec: string,
  projectDir: string = process.cwd(),
) {
  // Check if this is a tscircuit component format
  const normalizedName = normalizeTscircuitPackageName(packageSpec)

  // Determine what to display and what to install
  const displayName = normalizedName || packageSpec
  let installTarget = normalizedName || packageSpec

  console.log(`Adding ${displayName}...`)

  // Only handle @tsci registry setup if it's a tscircuit component
  if (normalizedName && normalizedName.startsWith("@tsci/")) {
    const npmrcPath = path.join(projectDir, ".npmrc")
    const npmrcContent = fs.existsSync(npmrcPath)
      ? fs.readFileSync(npmrcPath, "utf-8")
      : ""

    let hasTsciRegistry = /@tsci[/:]/.test(npmrcContent)

    if (!hasTsciRegistry) {
      const { addRegistry } = await prompts({
        type: "confirm",
        name: "addRegistry",
        message:
          "No .npmrc entry for @tsci packages was found. Add '@tsci:registry=https://npm.tscircuit.com'?",
        initial: true,
      })

      if (addRegistry) {
        const trimmedContent = npmrcContent.trimEnd()
        const newContent =
          (trimmedContent.length > 0 ? `${trimmedContent}\n` : "") +
          "@tsci:registry=https://npm.tscircuit.com\n"
        fs.writeFileSync(npmrcPath, newContent)
        console.log("Updated .npmrc with tscircuit registry")
        hasTsciRegistry = true
      } else {
        console.log(
          "Continuing without updating .npmrc; will fetch package directly from registry tarball.",
        )
      }
    }

    if (!hasTsciRegistry) {
      installTarget = await resolveTarballUrlFromRegistry(normalizedName)
    }
  }
  // For all other cases (URLs, scoped packages, regular npm packages), use packageSpec as-is

  // Install the package using the detected package manager
  const packageManager = getPackageManager()
  try {
    packageManager.install({ name: installTarget, cwd: projectDir })
    console.log(`Added ${displayName} successfully.`)
    
    // After installation, check if it's a KiCad library and setup types if needed
    await detectAndSetupKicadLibrary(packageSpec, projectDir)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to add ${displayName}:`, errorMessage)
    throw new Error(`Failed to add ${displayName}: ${errorMessage}`)
  }
}
