import type { Command } from "commander"
import { installProjectDependencies } from "lib/shared/install-project-dependencies"
import { isGitHubUrl } from "lib/shared/is-github-url"
import { installKicadLibrary } from "lib/shared/install-kicad-library"
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

        // No package specified, install all dependencies
        if (!packageArg) {
          await installProjectDependencies({ cwd })
          return
        }

        // Install a specific package
        console.log(`Installing ${packageArg}...`)

        // Ensure package.json exists
        await installProjectDependencies({ cwd })

        const packageManager = getPackageManager()

        // Check if it's a GitHub URL (for KiCad libraries, etc.)
        if (!isGitHubUrl(packageArg)) {
          // Install as a regular npm package
          packageManager.install({ name: packageArg, cwd })
        } else {
          // Handle GitHub repository installation
          await installKicadLibrary(packageArg, cwd)
        }

        console.log(`\n✓ Successfully installed ${packageArg}`)
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
