import { extractGitHubInfo } from "./extract-github-info"
import { generateKicadTypeDeclarations } from "./generate-kicad-type-declarations"
import { generateKicadExports } from "./generate-kicad-exports"
import { getPackageManager } from "./get-package-manager"

/**
 * Installs a KiCad library from a GitHub repository
 */
export async function installKicadLibrary(
  packageArg: string,
  cwd: string = process.cwd(),
): Promise<void> {
  console.log(`Detected GitHub repository`)

  const info = extractGitHubInfo(packageArg)
  if (!info) {
    throw new Error(`Invalid GitHub URL: ${packageArg}`)
  }

  const githubUrl = `github:${info.owner}/${info.repo}`
  console.log(`Installing from ${githubUrl}...`)

  // Use package manager to install (bun/yarn/pnpm support GitHub repos)
  const packageManager = getPackageManager()
  packageManager.install({ name: githubUrl, cwd })

  // Generate TypeScript declarations for .kicad_mod files
  await generateKicadTypeDeclarations(cwd)

  // Show usage examples
  await generateKicadExports(packageArg, cwd)
}
