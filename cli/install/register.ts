import type { Command } from "commander"
import { installProjectDependencies } from "lib/shared/install-project-dependencies"
import { installKicadLibrary } from "../../lib/shared/install-github-library"

export const registerInstall = (program: Command) => {
  program
    .command("install [packageSpec]")
    .description(
      "Install project dependencies or install a KiCad library package (e.g., tsci install https://github.com/espressif/kicad-libraries or tsci install kicad-libraries@1.0.0)",
    )
    .action(async (packageSpec?: string) => {
      try {
        if (packageSpec) {
          // Install KiCad library package
          await installKicadLibrary(packageSpec)
        } else {
          // Install project dependencies
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
