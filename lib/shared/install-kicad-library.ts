import fs from "node:fs"
import path from "node:path"
import { glob } from "glob"
import { execSync } from "node:child_process"
import kleur from "kleur"

export interface InstallKicadLibraryOptions {
  packageName: string
  cwd?: string
}

/**
 * Checks if a package name is a GitHub URL
 */
export function isGitHubUrl(packageName: string): boolean {
  return (
    packageName.startsWith("https://github.com/") ||
    packageName.startsWith("http://github.com/") ||
    packageName.startsWith("github:") ||
    /^[\w-]+\/[\w-]+$/.test(packageName) // owner/repo format
  )
}

/**
 * Installs a GitHub repository that doesn't have a package.json
 * (like KiCad library repositories) by cloning it into node_modules
 */
export async function installGitHubRepoManually(
  packageName: string,
  cwd: string = process.cwd(),
): Promise<string> {
  const info = extractGitHubInfo(packageName)
  if (!info) {
    throw new Error(`Invalid GitHub URL: ${packageName}`)
  }

  const nodeModulesPath = path.join(cwd, "node_modules")
  const targetPath = path.join(nodeModulesPath, info.repo)

  // Create node_modules if it doesn't exist
  if (!fs.existsSync(nodeModulesPath)) {
    fs.mkdirSync(nodeModulesPath, { recursive: true })
  }

  // Remove existing directory if present
  if (fs.existsSync(targetPath)) {
    console.log(kleur.gray(`Removing existing ${info.repo}...`))
    fs.rmSync(targetPath, { recursive: true, force: true })
  }

  // Clone the repository
  const gitUrl = `https://github.com/${info.owner}/${info.repo}.git`
  console.log(kleur.gray(`Cloning ${gitUrl}...`))

  try {
    execSync(`git clone --depth=1 ${gitUrl} "${targetPath}"`, {
      stdio: "pipe",
      cwd,
    })

    // Remove .git directory to save space
    const gitDir = path.join(targetPath, ".git")
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true })
    }

    console.log(kleur.green(`✓ Cloned ${info.owner}/${info.repo}`))
    return info.repo
  } catch (error) {
    throw new Error(
      `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
export function extractGitHubInfo(packageName: string): {
  owner: string
  repo: string
} | null {
  // github:owner/repo format
  if (packageName.startsWith("github:")) {
    const [owner, repo] = packageName.replace("github:", "").split("/")
    return { owner, repo }
  }

  // owner/repo format
  if (/^[\w-]+\/[\w-]+$/.test(packageName)) {
    const [owner, repo] = packageName.split("/")
    return { owner, repo }
  }

  // Full GitHub URL
  if (
    packageName.startsWith("https://github.com/") ||
    packageName.startsWith("http://github.com/")
  ) {
    const url = new URL(packageName)
    const [, owner, repo] = url.pathname.split("/")
    return { owner, repo: repo.replace(/\.git$/, "") }
  }

  return null
}

/**
 * Converts a GitHub URL to a format that package managers can install
 * For repos without package.json, uses tarball URL
 */
export function normalizeGitHubUrl(packageName: string): string {
  const info = extractGitHubInfo(packageName)
  if (!info) return packageName

  // Use tarball format which works without package.json
  return `https://github.com/${info.owner}/${info.repo}/tarball/master`
}

/**
 * Creates types in types/ folder
 */
export async function generateKicadTypeDeclarations(
  cwd: string = process.cwd(),
): Promise<void> {
  const nodeModulesPath = path.join(cwd, "node_modules")

  if (!fs.existsSync(nodeModulesPath)) {
    return
  }

  // Find all .kicad_mod files in node_modules
  const kicadModFiles = await glob("**/*.kicad_mod", {
    cwd: nodeModulesPath,
    absolute: false,
  })

  if (kicadModFiles.length === 0) {
    return
  }

  // Create types directory if it doesn't exist
  const typesDir = path.join(cwd, "types")
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true })
  }

  // Generate type declaration file in types/ folder
  const typeDeclarationPath = path.join(typesDir, "kicad_mod.d.ts")
  const typeDeclaration = `declare module "*.kicad_mod" {
  const value: string
  export default value
}
`

  fs.writeFileSync(typeDeclarationPath, typeDeclaration)
  console.log(
    `Generated type declarations for ${kicadModFiles.length} .kicad_mod file(s)`,
  )
  console.log(`Type declarations saved to: types/kicad_mod.d.ts`)
}

/**
 * Generates a barrel export file for easy importing of KiCad footprints
 */
export async function generateKicadExports(
  packageName: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const nodeModulesPath = path.join(cwd, "node_modules")

  // Extract the package directory name from the normalized package name
  const info = extractGitHubInfo(packageName)
  let packageDirName = packageName

  if (info) {
    packageDirName = info.repo
  }

  const packagePath = path.join(nodeModulesPath, packageDirName)

  if (!fs.existsSync(packagePath)) {
    return
  }

  // Find all .kicad_mod files in the package
  const kicadModFiles = await glob("**/*.kicad_mod", {
    cwd: packagePath,
    absolute: false,
  })

  if (kicadModFiles.length === 0) {
    return
  }

  console.log(
    `\nFound ${kicadModFiles.length} KiCad footprint(s) in ${packageDirName}:`,
  )
  console.log("\nYou can import them like this:")
  console.log("```tsx")

  // Show first few examples
  const exampleCount = Math.min(3, kicadModFiles.length)
  for (let i = 0; i < exampleCount; i++) {
    const file = kicadModFiles[i]
    const importPath = `${packageDirName}/${file}`
    const varName = path
      .basename(file, ".kicad_mod")
      .replace(/[^a-zA-Z0-9]/g, "_")
    console.log(`import ${varName} from "${importPath}"`)
  }

  if (kicadModFiles.length > exampleCount) {
    console.log(`// ... and ${kicadModFiles.length - exampleCount} more`)
  }

  console.log("\n// Then use in your circuit:")
  console.log('<chip footprint={ESP32_C3_DevKitM_1} name="U1" />')
  console.log("```")
}
