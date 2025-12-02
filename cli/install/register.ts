import type { Command } from "commander"
import { installProjectDependencies } from "lib/shared/install-project-dependencies"
import { addPackage } from "lib/shared/add-package"

export const registerInstall = (program: Command) => {
  program
    .command("install [packageSpec]")
    .description(
      "Install project dependencies, or install a specific package (e.g., tsci install https://github.com/espressif/kicad-libraries)",
    )
    .action(async (packageSpec?: string) => {
      try {
        if (packageSpec) {
          // Install a specific package (supports KiCad libraries, npm packages, GitHub URLs, etc.)
          await addPackage(packageSpec)
        } else {
          // Install all project dependencies
          await installProjectDependencies()
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
