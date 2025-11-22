import fs from "node:fs"
import path from "node:path"
import { glob } from "glob"

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
  import type { AnyCircuitElement } from "circuit-json"
  const value: AnyCircuitElement[]
  export default value
}
`

  fs.writeFileSync(typeDeclarationPath, typeDeclaration)
  console.log(
    `Generated type declarations for ${kicadModFiles.length} .kicad_mod file(s)`,
  )
  console.log(`Type declarations saved to: types/kicad_mod.d.ts`)
}
