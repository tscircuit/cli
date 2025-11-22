import fs from "node:fs"
import path from "node:path"
import { glob } from "glob"
import { extractGitHubInfo } from "./extract-github-info"

/**
 * Generates a type declaration file (types/${module}.d.ts) with all imports from a KiCad package
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

  // Generate type declaration file with imports
  const typeDeclarationPath = path.join(typesDir, `${packageDirName}.d.ts`)
  const imports = kicadModFiles
    .map((file) => {
      const importPath = `${packageDirName}/${file}`
      const varName = path
        .basename(file, ".kicad_mod")
        .replace(/[^a-zA-Z0-9]/g, "_")
      return `declare module "${importPath}" {
  import type { AnyCircuitElement } from "circuit-json"
  const value: AnyCircuitElement[]
  export default value
}`
    })
    .join("\n\n")

  fs.writeFileSync(typeDeclarationPath, imports)
}
