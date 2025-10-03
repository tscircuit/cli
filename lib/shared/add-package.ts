import * as fs from "node:fs"
import * as path from "node:path"
import { prompts } from "lib/utils/prompts"
import { getPackageManager } from "./get-package-manager"
import { resolveTarballUrlFromRegistry } from "./resolve-tarball-url-from-registry"

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

  let installTarget = packageName

  if (packageName.startsWith("@tsci/")) {
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
      installTarget = await resolveTarballUrlFromRegistry(packageName)
    }
  }

  // Install the package using the detected package manager
  const packageManager = getPackageManager()
  try {
    packageManager.install({ name: installTarget, cwd: projectDir })
    console.log(`Added ${packageName} successfully.`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to add ${packageName}:`, errorMessage)
    // Re-throw the error so the caller can handle it
    throw new Error(`Failed to add ${packageName}: ${errorMessage}`)
  }
}
