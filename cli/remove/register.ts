import { Command } from "commander"
import { removePackage } from "lib/shared/remove-package"

export const registerRemove = (program: Command) => {
  program
    .command("remove")
    .description("Remove a tscircuit component package from your project")
    .argument("<component>", "Component to remove (e.g. author/component-name)")
    .action(async (componentPath: string) => {
      try {
        await removePackage(componentPath)
      } catch (error) {
        process.exit(1)
      }
    })
}
