import type { Command } from "commander"
import { installProjectDependencies } from "lib/shared/install-project-dependencies"
import {
  isGitHubUrl,
  normalizeGitHubUrl,
  generateKicadTypeDeclarations,
  generateKicadExports,
  installGitHubRepoManually,
} from "lib/shared/install-kicad-library"
import { getPackageManager } from "lib/shared/get-package-manager"

export const registerInstall = (program: Command) => {
  program
    .command("install [package]")
    .description(
      "Install project dependencies, packages, or GitHub repositories (e.g., KiCad libraries)",
    )
    .action(async (packageArg?: string) => {
      try {
        const cwd = process.cwd()

        if (packageArg) {
          // Install a specific package
          console.log(`Installing ${packageArg}...`)

          // Ensure package.json exists
          await installProjectDependencies({ cwd })

          const packageManager = getPackageManager()

          // Check if it's a GitHub URL (for KiCad libraries, etc.)
          if (isGitHubUrl(packageArg)) {
            const normalizedUrl = normalizeGitHubUrl(packageArg)
            console.log(`Detected GitHub repository`)

            // Try installing via package manager first
            try {
              packageManager.install({ name: normalizedUrl, cwd })
            } catch (error) {
              // If package manager fails (likely no package.json), clone manually
              console.log(
                "Package manager installation failed, cloning repository manually...",
              )
              await installGitHubRepoManually(packageArg, cwd)
            }

            // Generate TypeScript declarations for .kicad_mod files
            await generateKicadTypeDeclarations(cwd)

            // Show usage examples (use original packageArg for extracting repo name)
            await generateKicadExports(packageArg, cwd)

            console.log(`\n✓ Successfully installed ${packageArg}`)
          } else {
            // Install as a regular npm package
            packageManager.install({ name: packageArg, cwd })
            console.log(`\n✓ Successfully installed ${packageArg}`)
          }
        } else {
          // No package specified, install all dependencies
          await installProjectDependencies({ cwd })
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message)
        } else {
          console.error(error)
        }
        process.exit(1)
      }
    })
}
