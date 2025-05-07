import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import kleur from "kleur"
import prompts from "prompts"
import { addPackage } from "lib/shared/add-package"

export const registerSearch = (program: Command) => {
  program
    .command("search")
    .description("Search for snippets in the tscircuit registry")
    .argument("<query>", "Search query (e.g. keyword, author, or snippet name)")
    .action(async (query: string) => {
      const ky = getRegistryApiKy()
      let results: {
        packages: Array<{ name: string; version: string; description?: string }>
      } = { packages: [] }

      try {
        results = await ky
          .post("packages/search", {
            json: { query },
          })
          .json()
      } catch (error) {
        console.error(
          kleur.red("Failed to search registry:"),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }

      if (!results.packages.length) {
        console.log(kleur.yellow("No packages found matching your query."))
        return
      }

      console.log(
        kleur.bold().underline(`Found ${results.packages.length} package(s):`),
      )

      const choices = results.packages.map((pkg) => ({
        title: pkg.name,
        description: pkg.description || "",
        value: pkg.name,
      }))

      const { selectedPackage } = await prompts({
        type: "select",
        name: "selectedPackage",
        message: "Select a package to add:",
        choices,
        initial: 0,
      })

      if (!selectedPackage) {
        console.log(kleur.yellow("No package selected."))
        return
      }

      const { confirm } = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Do you want to add ${kleur.green(selectedPackage)}?`,
        initial: true,
      })

      if (confirm) {
        try {
          console.log(kleur.blue(`Installing ${selectedPackage}...`))
          await addPackage(selectedPackage)
          console.log(kleur.green(`Successfully installed ${selectedPackage}`))
        } catch (error) {
          console.error(
            kleur.red(`Failed to install ${selectedPackage}:`),
            error,
          )
          process.exit(1)
        }
      }
    })
}
