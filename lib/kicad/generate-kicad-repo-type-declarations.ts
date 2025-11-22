import fs from "node:fs"
import path from "node:path"
import { glob } from "glob"
import { extractGitHubInfo } from "../shared/extract-github-info"

/**
 * Generates TypeScript type declarations for .kicad_mod files
 *
 * For each .kicad_mod file, creates a type declaration that:
 * - Declares the module as exporting a string (the file path to the .kicad_mod file)
 * - Matches how static-asset-plugin handles .kicad_mod files during build
 */
export async function generateKicadRepoTypeDeclarations(
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

  // Create types directory if it doesn't exist
  const typesDir = path.join(cwd, "types")
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true })
  }

  // Generate type declaration file that declares .kicad_mod files as string modules
  // (matching how static-asset-plugin handles them - as file paths)
  const typeDeclarationPath = path.join(typesDir, `${packageDirName}.d.ts`)
  const declarations = kicadModFiles
    .map((file) => {
      const importPath = `${packageDirName}/${file}`
      return `declare module "${importPath}" {
  const value: string
  export default value
}`
    })
    .join("\n\n")

  fs.writeFileSync(typeDeclarationPath, declarations)
  console.log(
    `Generated type declarations for ${kicadModFiles.length} .kicad_mod file(s)`,
  )
  console.log(`Type declarations saved to: types/${packageDirName}.d.ts`)
}
