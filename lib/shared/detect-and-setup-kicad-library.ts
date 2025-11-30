import * as fs from "node:fs"
import * as path from "node:path"
import { globbySync } from "globby"
import kleur from "kleur"
// @ts-ignore - strip-json-comments doesn't have types
import stripJsonComments from "strip-json-comments"
import { generateTsConfig } from "./generate-ts-config"
import { setupTsciProject } from "./setup-tsci-packages"

/**
 * Extracts the package name from a package spec
 * Handles various formats: github URLs, npm packages, scoped packages, etc.
 */
export function extractPackageName(packageSpec: string): string {
  // GitHub URL: https://github.com/user/repo or https://github.com/user/repo.git
  if (packageSpec.startsWith("http")) {
    const match = packageSpec.match(
      /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:[/#]|$)/,
    )
    if (match) {
      return match[2].replace(/\.git$/, "")
    }
  }

  // Git URL: git+https://...
  if (packageSpec.startsWith("git+")) {
    const match = packageSpec.match(/\/([^/]+?)(?:\.git)?(?:[/#]|$)/)
    if (match) {
      return match[1].replace(/\.git$/, "")
    }
  }

  // Scoped package with version: @scope/package@version
  if (packageSpec.startsWith("@")) {
    const match = packageSpec.match(/@([^/]+)\/([^@]+)/)
    if (match) {
      return `@${match[1]}/${match[2]}`
    }
  }

  // Regular package with version: package@version
  if (packageSpec.includes("@")) {
    return packageSpec.split("@")[0]
  }

  // Simple package name
  return packageSpec
}

/**
 * Detects if a package contains KiCad footprint files (.kicad_mod)
 * and generates TypeScript type definitions if found
 */
export async function detectAndSetupKicadLibrary(
  packageSpec: string,
  projectDir: string = process.cwd(),
): Promise<boolean> {
  try {
    const packageName = extractPackageName(packageSpec)
    const nodeModulesPath = path.join(projectDir, "node_modules", packageName)

    // Check if package exists in node_modules
    if (!fs.existsSync(nodeModulesPath)) {
      return false
    }

    // Look for .kicad_mod files
    const kicadModFiles = globbySync(["**/*.kicad_mod"], {
      cwd: nodeModulesPath,
      absolute: false,
    })

    if (kicadModFiles.length === 0) {
      return false
    }

    console.log(
      kleur.cyan(`Detected ${kleur.bold(kicadModFiles.length.toString())} KiCad footprint file(s)`),
      kleur.dim("generating types..."),
    )

    // Generate TypeScript type definitions
    await generateKicadTypes(projectDir, packageName, kicadModFiles)

    // Setup tsconfig.json
    await setupTsConfig(projectDir)

    // Setup tscircuit project dependencies (tscircuit includes react)
    // This ensures the user can build circuits using the KiCad footprints
    await setupTsciProject(projectDir)

    console.log(kleur.green(`✓ Generated types for KiCad library: ${kleur.bold(packageName)}`))

    return true
  } catch (error) {
    // Silently fail if KiCad detection has issues - don't break the add command
    console.warn(
      kleur.yellow(`Warning: Failed to detect/setup KiCad library: ${error instanceof Error ? error.message : String(error)}`),
    )
    return false
  }
}

/**
 * Generates TypeScript type definitions for .kicad_mod files
 */
async function generateKicadTypes(
  projectDir: string,
  packageName: string,
  kicadModFiles: string[],
): Promise<void> {
  const typesDir = path.join(projectDir, "types")
  fs.mkdirSync(typesDir, { recursive: true })

  const typeFileName = `${packageName.replace(/[@/]/g, "-")}.d.ts`
  const typesFilePath = path.join(typesDir, typeFileName)

  // Generate type declarations for each .kicad_mod file
  const declarations = kicadModFiles
    .map((filePath) => {
      const modulePath = `${packageName}/${filePath}`
      return `declare module "${modulePath}" {
  const value: string
  export default value
}`
    })
    .join("\n\n")

  fs.writeFileSync(typesFilePath, declarations)
  console.log(kleur.green(`✓ Generated types at ${kleur.cyan(`types/${typeFileName}`)}`))
}

/**
 * Sets up tsconfig.json to include the types directory
 */
async function setupTsConfig(projectDir: string): Promise<void> {
  const tsconfigPath = path.join(projectDir, "tsconfig.json")

  // Generate tsconfig if it doesn't exist
  if (!fs.existsSync(tsconfigPath)) {
    console.log(kleur.dim("Creating tsconfig.json..."))
    generateTsConfig(projectDir)
  }

  // Read and update tsconfig to include types directory
  const content = fs.readFileSync(tsconfigPath, "utf-8")
  // Use strip-json-comments to handle tsconfig.json with comments
  const tsconfig = JSON.parse(stripJsonComments(content))

  // Ensure compilerOptions exists
  if (!tsconfig.compilerOptions) {
    tsconfig.compilerOptions = {}
  }

  // Add typeRoots if not present
  if (!tsconfig.compilerOptions.typeRoots) {
    tsconfig.compilerOptions.typeRoots = ["./types", "./node_modules/@types"]
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
    console.log(kleur.green("✓ Updated tsconfig.json with types directory"))
  } else if (!tsconfig.compilerOptions.typeRoots.includes("./types")) {
    tsconfig.compilerOptions.typeRoots.unshift("./types")
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
    console.log(kleur.green("✓ Updated tsconfig.json with types directory"))
  }
}
