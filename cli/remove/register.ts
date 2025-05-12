import { Command } from "commander"
import { removePackage } from "lib/shared/remove-package"

export const registerRemove = (program: Command) => {
  program
    .command("remove")
    .description("Remove a tscircuit component package from your project")
    .argument("<component>", "Component to remove (e.g. author/component-name)")
    .action((componentPath: string) => {
      return removePackage(componentPath).catch(() => {
        process.exit(1)
      })
    })
}
