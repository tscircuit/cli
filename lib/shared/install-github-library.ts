import kleur from "kleur"
import { findProjectRoot } from "../kicad/find-project-root"
import { ensurePackageJson } from "../kicad/ensure-package-json"
import { installPackage } from "../kicad/install-package"
import { generateKicadTypesForPackage } from "../kicad/generate-types"
import { extractPackageName } from "lib/kicad/extract-package-name"
import { setupTsciProject } from "./setup-tsci-packages"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Install a package as a KiCad library
 * @param packageSpec - Any valid npm/bun package specifier (e.g., https://github.com/espressif/kicad-libraries, kicad-libraries@1.0.0, etc.)
 */
export async function installKicadLibrary(packageSpec: string) {
  console.log(kleur.gray(`Installing KiCad library: ${packageSpec}...`))

  // Extract package name from the package specifier
  const packageName = extractPackageName(packageSpec)

  // Find project root (where package.json exists or should be created)
  const projectRoot = findProjectRoot()

  // Ensure package.json exists
  ensurePackageJson(projectRoot)

  // Create .npmrc if it doesn't exist (needed for resolving tscircuit dependencies)
  const npmrcPath = path.join(projectRoot, ".npmrc")
  if (!fs.existsSync(npmrcPath)) {
    fs.writeFileSync(npmrcPath, "@tsci:registry=https://npm.tscircuit.com")
  }

  // Install the package using bun add
  console.log(kleur.gray(`Running: bun add ${packageSpec}`))
  installPackage(packageSpec, projectRoot)

  // Generate types file for .kicad_mod files
  await generateKicadTypesForPackage(projectRoot, packageName)

  // Setup tscircuit project dependencies (React, tscircuit, etc.)
  await setupTsciProject(projectRoot)

  console.log(kleur.green(`✓ Successfully installed ${packageName}`))
  console.log(
    kleur.gray(
      `\nYou can now import KiCad modules like:\nimport kicadMod from "${packageName}/path/to/footprint.kicad_mod"`,
    ),
  )
}
