import type { Command } from "commander"
import { addPackages } from "lib/shared/add-package"

export const registerAdd = (program: Command) => {
  program
    .command("add")
    .description("Add tscircuit component packages to your project")
    .argument(
      "<packageSpecs...>",
      "Packages to add (e.g. package-name, author/component, https://github.com/user/repo, package@version)",
    )
    .action(async (packageSpecs: string[]) => {
      try {
        await addPackages(packageSpecs)
      } catch (error) {
        process.exit(1)
      }
    })
}
