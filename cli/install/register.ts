import type { Command } from "commander"
import { installProjectDependencies } from "lib/shared/install-project-dependencies"
import { installGithubKicadLibrary } from "../../lib/shared/install-github-library"

export const registerInstall = (program: Command) => {
  program
    .command("install")
    .description(
      "Install project dependencies or install a GitHub KiCad library (e.g., tsci install https://github.com/espressif/kicad-libraries)",
    )
    .action(async (githubUrl?: string) => {
      try {
        if (githubUrl) {
          // Install GitHub KiCad library
          await installGithubKicadLibrary(githubUrl)
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
