import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import Fuse from "fuse.js"
import kleur from "kleur"

export const registerSearch = (program: Command) => {
  program
    .command("search")
    .description(
      "Search for footprints, CAD models or packages in the tscircuit ecosystem",
    )
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
        stock: number
        price: number
      }> = []

      let kicadResults: string[] = []

      try {
        results = await ky
          .post("packages/search", {
            json: { query },
          })
          .json()

        const jlcSearchUrl =
          "https://jlcsearch.tscircuit.com/api/search?limit=10&q=" +
          encodeURIComponent(query)
        jlcResults =
          ((await fetch(jlcSearchUrl).then((r) => r.json())) as any)
            ?.components ?? []

        const kicadFiles: string[] = await fetch(
          "https://kicad-mod-cache.tscircuit.com/kicad_files.json",
        ).then((r) => r.json())
        const fuse = new Fuse(kicadFiles)
        kicadResults = fuse
          .search(query)
          .slice(0, 10)
          .map((r) => r.item)
      } catch (error) {
        console.error(
          kleur.red("Failed to search registry:"),
          error instanceof Error ? error.message : error,
        )
        process.exit(1)
      }

      if (
        !results.packages.length &&
        !jlcResults.length &&
        !kicadResults.length
      ) {
        console.log(kleur.yellow("No results found matching your query."))
        return
      }

      if (kicadResults.length) {
        console.log(
          kleur
            .bold()
            .underline(`Found ${kicadResults.length} footprint(s) from KiCad:`),
        )

        kicadResults.forEach((path, idx) => {
          console.log(
            `${(idx + 1).toString().padStart(2, " ")}. ${path.replace(".kicad_mod", "").replace(".pretty", "")}`,
          )
        })
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
            `${idx + 1}. ${comp.mfr} (C${comp.lcsc}) - ${comp.description} (stock: ${comp.stock.toLocaleString("en-US")})`,
          )
        })
      }
      console.log("\n")
    })
}
