import type { Command } from "commander"
import kleur from "kleur"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import { addPackage } from "lib/shared/add-package"
import { prompts } from "lib/utils/prompts"
import ora from "ora"

export const registerImport = (program: Command) => {
  program
    .command("import")
    .description(
      "Search JLCPCB or the tscircuit registry and import a component",
    )
    .argument("<query>", "Chip name, part number, or package name")
    .option("--jlcpcb", "Search JLCPCB components")
    .option("--lcsc", "Alias for --jlcpcb")
    .option("--tscircuit", "Search tscircuit registry packages")
    .action(
      async (
        query: string,
        opts: {
          jlcpcb?: boolean
          lcsc?: boolean
          tscircuit?: boolean
        },
      ) => {
        const hasFilters = opts.jlcpcb || opts.lcsc || opts.tscircuit
        const searchJlc = opts.jlcpcb || opts.lcsc || !hasFilters
        const searchTscircuit = opts.tscircuit || !hasFilters
        const ky = getRegistryApiKy()
        const spinner = ora("Searching...").start()

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

        if (searchTscircuit) {
          try {
            spinner.text = "Searching tscircuit registry..."
            registryResults = (
              await ky
                .post("packages/search", { json: { query } })
                .json<{ packages: typeof registryResults }>()
            ).packages
          } catch (error) {
            spinner.fail("Failed to search registry")
            console.error(
              kleur.red("Error:"),
              error instanceof Error ? error.message : error,
            )
            spinner.start()
          }
        }

        if (searchJlc) {
          try {
            spinner.text = "Searching JLCPCB parts..."
            const searchUrl = `https://jlcsearch.tscircuit.com/api/search?limit=10&q=${encodeURIComponent(query)}`
            const resp = await fetch(searchUrl).then((r) => r.json())
            jlcResults = resp.components
          } catch (error) {
            spinner.fail("Failed to search JLCPCB")
            console.error(
              kleur.red("Error:"),
              error instanceof Error ? error.message : error,
            )
          }
        }

        spinner.stop()

        if (!registryResults.length && !jlcResults?.length) {
          console.log(
            kleur.yellow(
              `No results found for "${query}" in the tscircuit registry or JLCPCB.`,
            ),
          )
          return
        }

        const choices: Array<{
          title: string
          value:
            | { type: "registry"; name: string }
            | { type: "jlcpcb"; part: number }
          selected?: boolean
        }> = []

        registryResults?.forEach((pkg, idx) => {
          choices.push({
            title: `${pkg.name}${pkg.description ? ` - ${pkg.description}` : ""}`,
            value: { type: "registry", name: pkg.name },
            selected: idx === 0,
          })
        })

        jlcResults?.forEach((comp, idx) => {
          choices.push({
            title: `[jlcpcb] ${comp.mfr} (C${comp.lcsc}) - ${comp.description}`,
            value: { type: "jlcpcb", part: comp.lcsc },
            selected: !choices.length && idx === 0,
          })
        })

        const shouldAutoSelectSingleJlcResult =
          searchJlc && !searchTscircuit && choices.length === 1

        const choice = shouldAutoSelectSingleJlcResult
          ? choices[0].value
          : (
              await prompts({
                type: "select",
                name: "choice",
                message: "Select a part to import",
                choices,
              })
            ).choice

        if (!choice) {
          console.log("Aborted.")
          return process.exit(0)
        }

        if (choice.type === "registry") {
          const installSpinner = ora(`Installing ${choice.name}...`).start()
          try {
            await addPackage(choice.name)
            installSpinner.succeed(kleur.green(`Installed ${choice.name}`))
          } catch (error) {
            installSpinner.fail(kleur.red("Failed to add package"))
            console.error(error instanceof Error ? error.message : error)
            return process.exit(1)
          }
        } else {
          const importSpinner = ora(
            `Importing "C${choice.part}" from JLCPCB...`,
          ).start()
          try {
            const { filePath } = await importComponentFromJlcpcb(
              `C${String(choice.part)}`,
            )
            importSpinner.succeed(kleur.green(`Imported ${filePath}`))
          } catch (error) {
            importSpinner.fail(kleur.red("Failed to import part"))
            console.error(error instanceof Error ? error.message : error)
            return process.exit(1)
          }
        }
      },
    )
}
