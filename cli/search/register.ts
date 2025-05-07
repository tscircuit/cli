import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import kleur from "kleur"

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
      for (const pkg of results.packages) {
        console.log(
          kleur.green(pkg.name) +
            (pkg.description ? ` - ${pkg.description}` : ""),
        )
      }
    })
}
