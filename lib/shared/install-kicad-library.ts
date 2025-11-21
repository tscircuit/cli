import fs from "node:fs"
import path from "node:path"
import { glob } from "glob"

/**
 * Checks if a package name is a GitHub URL
 */
export function isGitHubUrl(packageName: string): boolean {
  return (
    packageName.startsWith("https://github.com/") ||
    packageName.startsWith("http://github.com/") ||
    packageName.startsWith("github:") ||
    /^[\w-]+\/[\w-]+$/.test(packageName)
  )
}

/**
 * Extracts owner and repo from a GitHub URL or identifier
 */
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
 * Generates TypeScript declarations for .kicad_mod files in types/ folder
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
 * Shows usage examples for imported KiCad footprints
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
