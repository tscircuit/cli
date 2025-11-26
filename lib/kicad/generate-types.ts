import * as fs from "node:fs"
import * as path from "node:path"
import kleur from "kleur"
import { globbySync } from "globby"
import { generateTsConfig } from "../shared/generate-ts-config"

/**
 * Generate TypeScript declaration file for KiCad modules in the installed package
 */
export async function generateKicadTypesForPackage(
  projectRoot: string,
  packageName: string,
): Promise<void> {
  const nodeModulesPath = path.join(projectRoot, "node_modules", packageName)

  if (!fs.existsSync(nodeModulesPath)) {
    console.warn(
      kleur.yellow(`Warning: Package ${packageName} not found in node_modules`),
    )
    return
  }

  // Find all .kicad_mod files in the package
  const kicadModFiles = globbySync(["**/*.kicad_mod"], {
    cwd: nodeModulesPath,
    absolute: false,
  })

  if (kicadModFiles.length === 0) {
    console.log(
      kleur.yellow(`No .kicad_mod files found in ${packageName} package`),
    )
    return
  }

  console.log(
    kleur.gray(
      `Found ${kicadModFiles.length} .kicad_mod file(s), generating types...`,
    ),
  )

  // Create types directory if it doesn't exist
  const typesDir = path.join(projectRoot, "types")
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true })
  }

  // Generate .d.ts file with module declarations for each .kicad_mod file
  const typesDtsPath = path.join(typesDir, `${packageName}.d.ts`)
  const declarations = kicadModFiles
    .map((filePath) => {
      const modulePath = `${packageName}/${filePath}`.replace(/\\/g, "/")
      return `declare module "${modulePath}" {
  const value: string
  export default value
}`
    })
    .join("\n\n")

  fs.writeFileSync(typesDtsPath, declarations)

  console.log(kleur.green(`✓ Generated types at types/${packageName}.d.ts`))

  // Ensure tsconfig.json includes the types directory
  ensureTsconfigIncludesTypes(projectRoot)
}

/**
 * Ensure tsconfig.json includes the types directory
 */
function ensureTsconfigIncludesTypes(projectRoot: string): void {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json")

  if (!fs.existsSync(tsconfigPath)) {
    console.log(kleur.gray("Creating tsconfig.json..."))
    generateTsConfig(projectRoot)
  }

  try {
    const tsconfigContent = fs.readFileSync(tsconfigPath, "utf-8")
    const tsconfig = JSON.parse(tsconfigContent)

    let modified = false

    // Ensure compilerOptions exists
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {}
      modified = true
    }

    // Ensure typeRoots includes ./types
    if (!tsconfig.compilerOptions.typeRoots) {
      tsconfig.compilerOptions.typeRoots = ["./node_modules/@types", "./types"]
      modified = true
    } else if (!tsconfig.compilerOptions.typeRoots.includes("./types")) {
      tsconfig.compilerOptions.typeRoots.push("./types")
      modified = true
    }

    if (modified) {
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
      console.log(kleur.green("✓ Updated tsconfig.json with types directory"))
    }
  } catch (error) {
    console.warn(
      kleur.yellow("Warning: Could not update tsconfig.json:"),
      error,
    )
  }
}
