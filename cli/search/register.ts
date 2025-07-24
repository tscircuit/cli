import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import kleur from "kleur"
import { prompts } from "lib/utils/prompts"
import { shouldBeInteractive } from "lib/utils/should-be-interactive"
import { addPackage } from "lib/shared/add-package"

export const registerSearch = (program: Command) => {
  program
    .command("search")
    .description("Search for packages in the tscircuit registry")
    .argument("<query>", "Search query (e.g. keyword, author, or package name)")
    .action(async (query: string) => {
      const ky = getRegistryApiKy()
      let results: {
        packages: Array<{
          name: string
          version: string
          description?: string
          star_count?: number
        }>
      } = { packages: [] }

      let jlcResults: Array<{
        lcsc: number
        mfr: string
        package: string
        description: string
        price: number
      }> = []

      try {
        results = await ky
          .post("packages/search", {
            json: { query },
          })
          .json()

        const jlcSearchUrl =
          "https://jlcsearch.tscircuit.com/api/search?limit=10&q=" +
          encodeURIComponent(query)
        jlcResults = (await fetch(jlcSearchUrl).then((r) => r.json()))
          .components
      } catch (error) {
        console.error(
          kleur.red("Failed to search registry:"),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }

      if (!results.packages.length && !jlcResults.length) {
        console.log(kleur.yellow("No results found matching your query."))
        return
      }

      if (results.packages.length) {
        console.log(
          kleur
            .bold()
            .underline(
              `Found ${results.packages.length} package(s) in the tscircuit registry:`,
            ),
        )

        results.packages.forEach((pkg, idx) => {
          const star = pkg.star_count ?? 0
          console.log(
            `${idx + 1}. ${pkg.name} (v${pkg.version}) - Stars: ${star}${
              pkg.description ? ` - ${pkg.description}` : ""
            }`,
          )
        })
      }

      if (jlcResults.length) {
        console.log()
        console.log(
          kleur
            .bold()
            .underline(
              `Found ${jlcResults.length} component(s) in JLC search:`,
            ),
        )

        jlcResults.forEach((comp, idx) => {
          console.log(
            `${idx + 1}. ${comp.mfr} (C${comp.lcsc}) - ${comp.description}`,
          )
        })
      }

      if (shouldBeInteractive() && results.packages.length) {
        const choices = results.packages.map((pkg, idx) => ({
          title: `${pkg.name} (v${pkg.version})`,
          description: pkg.description || "",
          value: pkg.name,
          ...(idx === 0 ? { selected: true } : {}),
        }))

        const { selectedPackage } = await prompts({
          type: "select",
          name: "selectedPackage",
          message: "Select a package to add:",
          choices,
        })

        if (selectedPackage) {
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
              console.log(
                kleur.green(`Successfully installed ${selectedPackage}`),
              )
            } catch (error) {
              console.error(
                kleur.red(`Failed to install ${selectedPackage}:`),
                error,
              )
              process.exit(1)
            }
          }
        }
      }
    })
}
