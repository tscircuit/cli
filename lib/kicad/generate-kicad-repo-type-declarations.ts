import fs from "node:fs"
import path from "node:path"
import { glob } from "glob"
import { extractGitHubInfo } from "../shared/extract-github-info"

export interface GenerateKicadRepoTypeDeclarationsOptions {
  packageDirName?: string
  kicadModFiles?: string[]
}

/**
 * Generates TypeScript declarations so TypeScript knows that importing paths
 * like `${packageDir}/some/path/file.kicad_mod` returns `FootprintSoupElements[]`.
 */
export async function generateKicadRepoTypeDeclarations(
  packageName: string,
  cwd: string = process.cwd(),
  options: GenerateKicadRepoTypeDeclarationsOptions = {},
): Promise<void> {
  const nodeModulesPath = path.join(cwd, "node_modules")

  // Extract the package directory name from the normalized package name
  const info = extractGitHubInfo(packageName)
  let packageDirName = options.packageDirName ?? packageName

  if (info) {
    packageDirName = info.repo
  }

  const packagePath = path.join(nodeModulesPath, packageDirName)

  if (!fs.existsSync(packagePath)) {
    return
  }

  const normalizeRelativePath = (file: string) => file.split(path.sep).join("/")
  let kicadModFiles = options.kicadModFiles
    ? options.kicadModFiles.map(normalizeRelativePath)
    : null

  if (!kicadModFiles) {
    const discoveredFiles = await glob("**/*.kicad_mod", {
      cwd: packagePath,
      absolute: false,
    })
    kicadModFiles = discoveredFiles.map(normalizeRelativePath)
  }

  kicadModFiles.sort()

  if (kicadModFiles.length === 0) {
    return
  }

  // Create types directory if it doesn't exist
  const typesDir = path.join(cwd, "types")
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true })
  }

  // Generate type declaration file that declares .kicad_mod files as Circuit JSON array modules
  const typeDeclarationPath = path.join(typesDir, `${packageDirName}.d.ts`)
  const declarations = kicadModFiles
    .map((file) => {
      const importPath = `${packageDirName}/${file}`
      return `declare module "${importPath}" {
  const value: FootprintSoupElements[]
  export default value
}`
    })
    .join("\n\n")

  const fileContents = `import type { FootprintSoupElements } from "@tscircuit/props/lib/common/footprintProp"\n\n${declarations}\n`

  fs.writeFileSync(typeDeclarationPath, fileContents)
  console.log(
    `Generated type declarations for ${kicadModFiles.length} .kicad_mod file(s)`,
  )
  console.log(`Type declarations saved to: types/${packageDirName}.d.ts`)
}
