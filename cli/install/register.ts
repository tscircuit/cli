import type { Command } from "commander"
import { installProjectDependencies } from "lib/shared/install-project-dependencies"

export const registerInstall = (program: Command) => {
  program
    .command("install")
    .description(
      "Install project dependencies and generate package.json if needed",
    )
    .action(async () => {
      try {
        await installProjectDependencies()
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
