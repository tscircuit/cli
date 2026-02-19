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
    .option("--kicad", "Search KiCad footprints")
    .option("--jlcpcb", "Search JLCPCB components")
    .option("--lcsc", "Alias for --jlcpcb")
    .option("--tscircuit", "Search tscircuit registry packages")
    .action(
      async (
        query: string,
        opts: {
          kicad?: boolean
          jlcpcb?: boolean
          lcsc?: boolean
          tscircuit?: boolean
        },
      ) => {
        const hasFilters =
          opts.kicad || opts.jlcpcb || opts.lcsc || opts.tscircuit
        const searchKicad = opts.kicad || !hasFilters
        const searchJlc = opts.jlcpcb || opts.lcsc || !hasFilters
        const searchTscircuit = opts.tscircuit || !hasFilters

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
          if (searchTscircuit) {
            const ky = getRegistryApiKy()
            results = await ky
              .post("packages/search", {
                json: { query },
              })
              .json()
          }

          if (searchJlc) {
            const jlcSearchUrl =
              "https://jlcsearch.tscircuit.com/api/search?limit=10&q=" +
              encodeURIComponent(query)
            const jlcResponse = await fetch(jlcSearchUrl).then((r) => r.json())
            jlcResults = jlcResponse?.components ?? []
          }

          if (searchKicad) {
            const kicadFiles: string[] = await fetch(
              "https://kicad-mod-cache.tscircuit.com/kicad_files.json",
            ).then((r) => r.json())
            const fuse = new Fuse(kicadFiles)
            kicadResults = fuse
              .search(query)
              .slice(0, 10)
              .map((r) => r.item)
          }
        } catch (error) {
          console.error(
            kleur.red("Failed to search registry:"),
            error instanceof Error ? error.message : error,
          )
          process.exit(1)
        }

        if (
          !kicadResults.length &&
          !results.packages.length &&
          !jlcResults.length
        ) {
          const sources = [
            searchTscircuit && "tscircuit registry",
            searchJlc && "JLCPCB",
            searchKicad && "KiCad",
          ].filter(Boolean)
          console.log(
            kleur.yellow(
              `No results found for "${query}" in ${sources.join(", ")}.`,
            ),
          )
          return
        }

        if (kicadResults.length) {
          console.log(
            kleur
              .bold()
              .underline(
                `Found ${kicadResults.length} footprint(s) from KiCad:`,
              ),
          )

          kicadResults.forEach((path, idx) => {
            console.log(
              `${(idx + 1).toString().padStart(2, " ")}. kicad:${path
                .replace(".kicad_mod", "")
                .replace(".pretty", "")}`,
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
            const versionStr = pkg.version ? ` (v${pkg.version})` : ""
            console.log(
              `${idx + 1}. ${pkg.name}${versionStr} - Stars: ${star}${
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
      },
    )
}
