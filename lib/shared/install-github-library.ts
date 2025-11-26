import kleur from "kleur"
import { validateGithubUrl } from "../kicad/validate-github-url"
import { findProjectRoot } from "../kicad/find-project-root"
import { ensurePackageJson } from "../kicad/ensure-package-json"
import { installPackage } from "../kicad/install-package"
import { generateKicadTypesForPackage } from "../kicad/generate-types"

/**
 * Install a GitHub repository as a KiCad library
 * @param githubUrl - GitHub URL (e.g., https://github.com/espressif/kicad-libraries)
 */
export async function installGithubKicadLibrary(githubUrl: string) {
  console.log(kleur.gray(`Installing KiCad library from ${githubUrl}...`))

  // Validate GitHub URL
  const [owner, repo] = validateGithubUrl(githubUrl)

  // Find project root (where package.json exists or should be created)
  const projectRoot = findProjectRoot()

  // Ensure package.json exists
  ensurePackageJson(projectRoot)

  // Install the GitHub repository using bun add
  console.log(kleur.gray(`Running: bun add ${githubUrl}`))
  installPackage(githubUrl, projectRoot)

  // Generate types file for .kicad_mod files
  await generateKicadTypesForPackage(projectRoot, repo)

  console.log(kleur.green(`✓ Successfully installed ${owner}/${repo}`))
  console.log(
    kleur.gray(
      `\nYou can now import KiCad modules like:\nimport kicadMod from "${repo}/path/to/footprint.kicad_mod"`,
    ),
  )
}
