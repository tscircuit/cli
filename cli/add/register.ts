import type { Command } from "commander"
import { addPackage } from "lib/shared/add-package"

export const registerAdd = (program: Command) => {
  program
    .command("add")
    .description("Add a package to your project (works like bun add)")
    .argument(
      "<packageSpec>",
      "Package to add (e.g. package-name, author/component, https://github.com/user/repo, package@version)",
    )
    .action(async (packageSpec: string) => {
      try {
        await addPackage(packageSpec)
      } catch (error) {
        process.exit(1)
      }
    })
}
