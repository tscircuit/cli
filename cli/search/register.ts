import type { Command } from "commander"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import Fuse from "fuse.js"
import kleur from "kleur"
import { getQueryFromParts } from "cli/utils/get-query-from-parts"

export const registerSearch = (program: Command) => {
  program
    .command("search")
    .description(
      "Search for footprints, CAD models or packages in the tscircuit ecosystem",
    )
    .argument(
      "<query...>",
      "Search query (e.g. keyword, author, or package name)",
    )
    .option("--kicad", "Search KiCad footprints")
    .option("--jlcpcb", "Search JLCPCB components")
    .option("--lcsc", "Alias for --jlcpcb")
    .option("--ti", "Search Texas Instruments components")
    .option("--digikey", "Search DigiKey components")
    .option("--mouser", "Search Mouser components")
    .option("--tscircuit", "Search tscircuit registry packages")
    .option("--json", "Output search results as JSON")
    .action(
      async (
        queryParts: string[],
        opts: {
          kicad?: boolean
          jlcpcb?: boolean
          lcsc?: boolean
          ti?: boolean
          digikey?: boolean
          mouser?: boolean
          tscircuit?: boolean
          json?: boolean
        },
      ) => {
        const query = getQueryFromParts(queryParts)
        const hasFilters =
          opts.kicad ||
          opts.jlcpcb ||
          opts.lcsc ||
          opts.ti ||
          opts.digikey ||
          opts.mouser ||
          opts.tscircuit
        const searchKicad = opts.kicad
        const searchJlc = opts.jlcpcb || opts.lcsc || !hasFilters
        const searchTscircuit = opts.tscircuit

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

        let tiResults: Array<{
          mfr: string
          package: string
          description: string
          stock: number
          price: number | null
          ti_product_number?: string
          product_url?: string
          datasheet_url?: string
        }> = []

        const distributors = [
          { source: "digikey", label: "DigiKey", enabled: opts.digikey },
          { source: "mouser", label: "Mouser", enabled: opts.mouser },
        ] as const
        const distributorResults: Array<{
          source: "digikey" | "mouser"
          label: string
          components: Array<{
            mfr: string
            description: string
            stock: number
            supplier_part_number?: string
            digikey_product_number?: string
            mouser_product_number?: string
          }>
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

          if (opts.ti) {
            const tiSearchUrl =
              "https://tisearch.tscircuit.com/api/search?limit=10&q=" +
              encodeURIComponent(query)
            const response = await fetch(tiSearchUrl)
            if (!response.ok)
              throw new Error(`TI search failed (HTTP ${response.status})`)
            const data = await response.json()
            if (!Array.isArray(data?.components))
              throw new Error("TI search returned an invalid response")
            tiResults = data.components
          }

          for (const distributor of distributors) {
            if (!distributor.enabled) continue
            const url = `https://${distributor.source}search.tscircuit.com/api/search?limit=10&q=${encodeURIComponent(query)}`
            const response = await fetch(url, {
              headers: { accept: "application/json" },
            })
            if (!response.ok)
              throw new Error(
                `${distributor.label} search failed (HTTP ${response.status})`,
              )
            const data = await response.json()
            if (!Array.isArray(data?.components))
              throw new Error(
                `${distributor.label} search returned an invalid response`,
              )
            distributorResults.push({
              ...distributor,
              components: data.components,
            })
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
            kleur.red("Failed to search:"),
            error instanceof Error ? error.message : error,
          )
          process.exit(1)
        }

        if (opts.json) {
          const unifiedResults = [
            ...kicadResults.map((path) => ({
              source: "kicad" as const,
              path,
            })),
            ...results.packages.map((pkg) => ({
              source: "tscircuit" as const,
              ...pkg,
            })),
            ...tiResults.map((comp) => ({
              ...comp,
              source: "ti" as const,
            })),
            ...distributorResults.flatMap(({ source, components }) =>
              components.map((comp) => ({ ...comp, source })),
            ),
            ...jlcResults.map((comp) => ({
              source: "jlcpcb" as const,
              ...comp,
            })),
          ]

          console.log(
            JSON.stringify(
              {
                query,
                results: unifiedResults,
              },
              null,
              2,
            ),
          )
          return
        }

        if (
          !kicadResults.length &&
          !results.packages.length &&
          !jlcResults.length &&
          !tiResults.length &&
          !distributorResults.some(({ components }) => components.length)
        ) {
          const sources = [
            searchTscircuit && "tscircuit registry",
            searchJlc && "JLCPCB",
            opts.ti && "Texas Instruments",
            ...distributors.filter((d) => d.enabled).map((d) => d.label),
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
        if (tiResults.length) {
          console.log()
          console.log(
            kleur
              .bold()
              .underline(
                `Found ${tiResults.length} component(s) in TI search:`,
              ),
          )
          tiResults.forEach((comp, idx) => {
            console.log(
              `${idx + 1}. ${comp.mfr} - ${comp.description} (stock: ${comp.stock.toLocaleString("en-US")})`,
            )
          })
        }
        for (const { source, label, components } of distributorResults) {
          if (!components.length) continue
          console.log()
          console.log(
            kleur
              .bold()
              .underline(
                `Found ${components.length} component(s) in ${label} search:`,
              ),
          )
          components.forEach((comp, idx) => {
            const supplierNumber =
              comp.supplier_part_number || comp[`${source}_product_number`]
            const identity = supplierNumber
              ? `${comp.mfr} (${supplierNumber})`
              : comp.mfr
            console.log(
              `${idx + 1}. ${identity} - ${comp.description} (stock: ${comp.stock.toLocaleString("en-US")})`,
            )
          })
        }
        console.log("\n")
      },
    )
}
