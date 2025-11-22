import { extractGitHubInfo } from "./extract-github-info"
import { generateKicadRepoTypeDeclarations } from "../kicad/generate-kicad-repo-type-declarations"
import { printKicadRepoUsage } from "../kicad/print-kicad-repo-usage"
import { getPackageManager } from "./get-package-manager"
import { cacheKicadFootprints } from "../kicad/cache-kicad-footprints"
import { patchKicadPackageExports } from "../kicad/patch-kicad-package-exports"

/**
 * Installs a KiCad library from a GitHub repository
 */
export async function installGithubLibrary(
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

  const cachedInfo = await cacheKicadFootprints(packageArg, cwd)

  if (cachedInfo) {
    patchKicadPackageExports(cachedInfo)
    await generateKicadRepoTypeDeclarations(packageArg, cwd, {
      packageDirName: cachedInfo.packageDirName,
      kicadModFiles: cachedInfo.kicadModFiles,
    })
  }

  // Print usage examples
  await printKicadRepoUsage(packageArg, cwd)
}
