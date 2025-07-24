import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import kleur from "kleur"
import { prompts } from "lib/utils/prompts"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
import { addPackage } from "lib/shared/add-package"

export const registerImport = (program: Command) => {
  program
    .command("import")
    .description(
      "Search JLCPCB or the tscircuit registry and import a component",
    )
    .argument("<query>", "Chip name, part number, or package name")
    .action(async (query: string) => {
      const ky = getRegistryApiKy()

      let registryResults: Array<{
        name: string
        version: string
        description?: string
      }> = []
      let jlcResults: Array<{
        lcsc: number
        mfr: string
        package: string
        description: string
        price: number
      }> = []

      try {
        registryResults = (
          await ky
            .post("packages/search", { json: { query } })
            .json<{ packages: typeof registryResults }>()
        ).packages
      } catch (error) {
        console.error(
          kleur.red("Failed to search registry:"),
          error instanceof Error ? error.message : error,
        )
      }

      try {
        const searchUrl =
          "https://jlcsearch.tscircuit.com/api/search?limit=10&q=" +
          encodeURIComponent(query)
        const resp = await fetch(searchUrl).then((r) => r.json())
        jlcResults = resp.components
      } catch (error) {
        console.error(
          kleur.red("Failed to search JLCPCB:"),
          error instanceof Error ? error.message : error,
        )
      }

      if (!registryResults.length && !jlcResults.length) {
        console.log(kleur.yellow("No results found matching your query."))
        return
      }

      const choices: Array<{
        title: string
        value:
          | { type: "registry"; name: string }
          | { type: "jlcpcb"; part: number }
        selected?: boolean
      }> = []

      registryResults.forEach((pkg, idx) => {
        choices.push({
          title: `${pkg.name}${pkg.description ? ` - ${pkg.description}` : ""}`,
          value: { type: "registry", name: pkg.name },
          selected: idx === 0,
        })
      })

      jlcResults.forEach((comp, idx) => {
        choices.push({
          title: `${comp.mfr} (C${comp.lcsc}) - ${comp.description}`,
          value: { type: "jlcpcb", part: comp.lcsc },
          selected: !choices.length && idx === 0,
        })
      })

      const { choice } = await prompts({
        type: "select",
        name: "choice",
        message: "Select a part to import",
        choices,
      })

      if (!choice) {
        console.log("Aborted.")
        return process.exit(0)
      }

      if (choice.type === "registry") {
        try {
          await addPackage(choice.name)
          console.log(kleur.green(`Installed ${choice.name}`))
        } catch (error) {
          console.error(
            kleur.red("Failed to add package:"),
            error instanceof Error ? error.message : error,
          )
          return process.exit(1)
        }
      } else {
        try {
          const { filePath } = await importComponentFromJlcpcb(
            String(choice.part),
          )
          console.log(kleur.green(`Imported ${filePath}`))
        } catch (error) {
          console.error(
            kleur.red("Failed to import part:"),
            error instanceof Error ? error.message : error,
          )
          return process.exit(1)
        }
      }
    })
}
