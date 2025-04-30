import { Command } from "commander"
// Removed unused imports: fs, path, execSync, detectPackageManager, checkForTsciUpdates
import { addPackage } from "lib/shared/add-package"

export const registerAdd = (program: Command) => {
  program
    .command("add")
    .description("Add a tscircuit component package to your project")
    .argument("<component>", "Component to add (e.g. author/component-name)")
    .action(async (componentPath: string) => {
      try {
        await addPackage(componentPath)
      } catch (error) {
        process.exit(1)
      }
    })
}
