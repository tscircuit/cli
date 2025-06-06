import type { Command } from "commander"
import path from "node:path"
import { pullPackage } from "lib/shared/pull-package"

export const registerPull = (program: Command) => {
  program
    .command("pull")
    .description("Fetch latest package files from the registry")
    .argument("[directory]", "Directory of the package")
    .action(async (directory?: string) => {
      const projectDir = path.resolve(directory || process.cwd())
      try {
        await pullPackage(projectDir)
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "error_code" in error &&
          "message" in error
        ) {
          console.error(JSON.stringify(error))
        } else {
          const message = error instanceof Error ? error.message : String(error)
          console.error(
            JSON.stringify({ error_code: "unknown_error", message }),
          )
        }
        process.exit(1)
      }
    })
}
