import * as path from "node:path"
import * as fs from "node:fs"
import kleur from "kleur"
import { getPackageManager } from "./get-package-manager"
import { normalizeTscircuitPackageName } from "./add-package"

export async function updatePackage(
  packageSpec?: string,
  projectDir: string = process.cwd(),
) {
  const packageManager = getPackageManager()

  if (!packageSpec) {
    const pkgJsonPath = path.join(projectDir, "package.json")
    if (!fs.existsSync(pkgJsonPath)) {
      console.log(
        kleur.yellow("No package.json found. Cannot update all packages."),
      )
      return
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"))
    const allDeps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {}),
    }

    const tsciPackages = Object.keys(allDeps).filter(
      (dep) => dep.startsWith("@tsci/") || dep.startsWith("@tscircuit/"),
    )

    if (tsciPackages.length === 0) {
      console.log(
        kleur.yellow("No tscircuit packages found in package.json to update."),
      )
      return
    }

    const targetList = tsciPackages.join(" ")
    console.log(
      kleur.cyan(
        `Updating ${tsciPackages.length} packages: ${kleur.bold(targetList)}...`,
      ),
    )

    try {
      packageManager.update({ name: targetList, cwd: projectDir })
      console.log(kleur.green(`✓ Updated all tscircuit packages successfully`))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error(kleur.red(`✗ Failed to update packages:`), errorMessage)
      throw new Error(`Failed to update packages: ${errorMessage}`)
    }
    return
  }

  // Single package update
  const normalizedName = normalizeTscircuitPackageName(packageSpec)
  const displayName = normalizedName || packageSpec
  const updateTarget = normalizedName || packageSpec

  console.log(kleur.cyan(`Updating ${kleur.bold(displayName)}...`))

  try {
    packageManager.update({ name: updateTarget, cwd: projectDir })
    console.log(
      kleur.green(`✓ Updated ${kleur.bold(displayName)} successfully`),
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(kleur.red(`✗ Failed to update ${displayName}:`), errorMessage)
    throw new Error(`Failed to update ${displayName}: ${errorMessage}`)
  }
}
