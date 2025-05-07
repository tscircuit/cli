import { Command } from "commander"
import { addPackage } from "lib/shared/add-package"
import { searchPackages } from "lib/shared/search-packages"
import chalk from "chalk"
import inquirer from "inquirer"

export const registerAdd = (program: Command) => {
  program
    .command("add")
    .alias("import")
    .description("Add/import a tscircuit component package to your project")
    .argument("[component]", "Component to add (e.g. author/component-name)")
    .action(async (componentPath?: string) => {
      try {
        if (!componentPath) {
          // Interactive mode using search
          const { searchQuery } = await inquirer.prompt<{
            searchQuery: string
          }>([
            {
              type: "input",
              name: "searchQuery",
              message: "Search for packages to install:",
              validate: (input: string) =>
                input.length > 0 || "Please enter a search term",
            },
          ])

          console.log(chalk.blue("Searching for packages..."))
          const searchResults = await searchPackages(searchQuery)

          if (searchResults.length === 0) {
            console.log(chalk.yellow("No packages found matching your search."))
            return
          }

          const { selectedPackages } = await inquirer.prompt<{
            selectedPackages: string[]
          }>({
            type: "checkbox",
            name: "selectedPackages",
            message: "Select packages to install:",
            choices: searchResults.map((pkg) => ({
              name: `${pkg.name} - ${pkg.description || "No description"}`,
              value: pkg.name,
            })),
          })

          if (selectedPackages.length === 0) {
            console.log(chalk.yellow("No packages selected."))
            return
          }

          for (const packageName of selectedPackages) {
            console.log(chalk.blue(`\nInstalling ${packageName}...`))
            await addPackage(packageName)
          }
        } else {
          // Direct install mode
          await addPackage(componentPath)
        }
      } catch (error) {
        console.error(
          chalk.red("Error:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
