import type { Command } from "commander"
import { updatePackage } from "lib/shared/update-package"

export const registerUpdate = (program: Command) => {
  program
    .command("update")
    .description("Update tscircuit component packages to their latest version")
    .argument(
      "[packageSpec]",
      "Package to update, leave blank to update all @tsci dependencies.",
    )
    .action(async (packageSpec?: string) => {
      try {
        await updatePackage(packageSpec)
      } catch (error) {
        process.exit(1)
      }
    })
}
