import * as fs from "node:fs"
import * as path from "node:path"
import kleur from "kleur"

/**
 * Ensure package.json exists in the project root
 */
export function ensurePackageJson(projectRoot: string): void {
  const packageJsonPath = path.join(projectRoot, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    console.log(kleur.yellow("Creating package.json..."))
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(
        {
          name: path.basename(projectRoot),
          version: "0.0.1",
          type: "module",
        },
        null,
        2,
      ),
    )
  }
}
