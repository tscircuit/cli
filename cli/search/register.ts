import { getQueryFromParts } from "cli/utils/get-query-from-parts"
import type { Command } from "commander"
import Fuse from "fuse.js"
import kleur from "kleur"
import { getRegistryApiKy } from "lib/registry-api/get-ky"
import { getPartsEngineBaseUrl } from "lib/shared/parts-engine-base-urls"
import {
  type DatasheetSearchResult,
  searchDatasheets,
} from "./search-datasheets"

const searchSources = [
  "kicad",
  "jlcpcb",
  "ti",
  "digikey",
  "mouser",
  "tscircuit",
  "datasheets",
] as const

type SearchSource = (typeof searchSources)[number]

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
    .option("--datasheets", "Search parts in the datasheet catalog")
    .option("--json", "Output search results as JSON")
    .addHelpText(
      "after",
      `\nSearches all sources by default. Source flags restrict the search.\nSet TSCIRCUIT_DEFAULT_SEARCH_SOURCES to a comma-separated list to override the defaults.\nAvailable sources: ${searchSources.join(", ")}.\n`,
    )
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
          datasheets?: boolean
          json?: boolean
        },
      ) => {
        const query = getQueryFromParts(queryParts)
        const explicitSources = searchSources.filter(
          (source) => opts[source] || (source === "jlcpcb" && opts.lcsc),
        )
        const hasFilters = explicitSources.length > 0
        const defaultSources: readonly string[] =
          process.env.TSCIRCUIT_DEFAULT_SEARCH_SOURCES?.split(",").map(
            (source) => source.trim(),
          ) ?? searchSources
        const selected = (source: SearchSource) =>
          hasFilters
            ? explicitSources.includes(source)
            : defaultSources.includes(source)
        const searchKicad = selected("kicad")
        const searchJlc = selected("jlcpcb")
        const searchTscircuit = selected("tscircuit")
        const searchTi = selected("ti")
        const searchDatasheetCatalog = selected("datasheets")

        let searchErrors: Array<{ source: SearchSource; message: string }> = []

        let datasheetResults: DatasheetSearchResult[] = []

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
          {
            source: "digikey",
            label: "DigiKey",
            enabled: selected("digikey"),
          },
          {
            source: "mouser",
            label: "Mouser",
            enabled: selected("mouser"),
          },
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
          const invalidSources = defaultSources.filter(
            (source) =>
              !searchSources.some((available) => available === source),
          )
          if (!hasFilters && invalidSources.length)
            throw new Error(
              `Invalid TSCIRCUIT_DEFAULT_SEARCH_SOURCES: ${JSON.stringify(invalidSources)}. Expected a comma-separated list of: ${searchSources.join(", ")}`,
            )

          const signal = AbortSignal.timeout(10_000)
          const searches: Array<{
            source: SearchSource
            run: () => Promise<void>
          }> = []

          if (searchDatasheetCatalog) {
            searches.push({
              source: "datasheets",
              async run() {
                datasheetResults = await searchDatasheets(query, signal)
              },
            })
          }

          if (searchTscircuit) {
            searches.push({
              source: "tscircuit",
              async run() {
                const ky = getRegistryApiKy()
                const data = await ky
                  .post("packages/search", { json: { query }, signal })
                  .json<typeof results>()
                if (!Array.isArray(data?.packages))
                  throw new Error(
                    "Registry search returned an invalid response",
                  )
                results = data
              },
            })
          }

          if (searchJlc) {
            searches.push({
              source: "jlcpcb",
              async run() {
                const baseUrl = getPartsEngineBaseUrl(
                  "jlcsearch",
                  "https://jlcsearch.tscircuit.com",
                )
                const url = `${baseUrl}/api/search?limit=10&q=${encodeURIComponent(query)}`
                const response = await fetch(url, { signal })
                if (!response.ok)
                  throw new Error(
                    `JLCPCB search failed (HTTP ${response.status})`,
                  )
                const data = await response.json()
                if (!Array.isArray(data?.components))
                  throw new Error("JLCPCB search returned an invalid response")
                jlcResults = data.components
              },
            })
          }

          if (searchTi) {
            searches.push({
              source: "ti",
              async run() {
                const url = `https://tisearch.tscircuit.com/api/search?limit=10&q=${encodeURIComponent(query)}`
                const response = await fetch(url, { signal })
                if (!response.ok)
                  throw new Error(`TI search failed (HTTP ${response.status})`)
                const data = await response.json()
                if (!Array.isArray(data?.components))
                  throw new Error("TI search returned an invalid response")
                tiResults = data.components
              },
            })
          }

          for (const distributor of distributors) {
            if (!distributor.enabled) continue
            searches.push({
              source: distributor.source,
              async run() {
                const baseUrl = getPartsEngineBaseUrl(
                  distributor.source,
                  `https://${distributor.source}search.tscircuit.com`,
                )
                const url = `${baseUrl}/api/search?limit=10&q=${encodeURIComponent(query)}`
                const response = await fetch(url, {
                  headers: { accept: "application/json" },
                  signal,
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
              },
            })
          }

          if (searchKicad) {
            searches.push({
              source: "kicad",
              async run() {
                const response = await fetch(
                  "https://kicad-mod-cache.tscircuit.com/kicad_files.json",
                  { signal },
                )
                if (!response.ok)
                  throw new Error(
                    `KiCad search failed (HTTP ${response.status})`,
                  )
                const files = await response.json()
                if (
                  !Array.isArray(files) ||
                  files.some((file) => typeof file !== "string")
                )
                  throw new Error("KiCad search returned an invalid response")
                const fuse = new Fuse<string>(files)
                kicadResults = fuse
                  .search(query, { limit: 10 })
                  .map(({ item }) => item)
              },
            })
          }

          const outcomes = await Promise.allSettled(
            searches.map(({ run }) => run()),
          )
          searchErrors = outcomes.flatMap((outcome, index) =>
            outcome.status === "rejected"
              ? [
                  {
                    source: searches[index]!.source,
                    message:
                      outcome.reason instanceof Error
                        ? outcome.reason.message
                        : String(outcome.reason),
                  },
                ]
              : [],
          )
          if (searchErrors.length === searches.length) {
            throw new Error(
              searchErrors.length === 1
                ? searchErrors[0]!.message
                : searchErrors
                    .map(({ source, message }) => `${source}: ${message}`)
                    .join("; "),
            )
          }
          for (const { source, message } of searchErrors)
            console.error(kleur.yellow(`Failed to search ${source}:`), message)
          // Keep output stable when distributor requests finish in a different order.
          distributorResults.sort((a, b) => a.source.localeCompare(b.source))
        } catch (error) {
          console.error(
            kleur.red("Failed to search:"),
            error instanceof Error ? error.message : error,
          )
          process.exit(1)
        }

        if (opts.json) {
          const unifiedResults = [
            ...datasheetResults.map((datasheet) => ({
              source: "datasheets" as const,
              ...datasheet,
            })),
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
                ...(searchErrors.length ? { errors: searchErrors } : {}),
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
          !datasheetResults.length &&
          !distributorResults.some(({ components }) => components.length)
        ) {
          const succeeded = (source: SearchSource) =>
            selected(source) &&
            !searchErrors.some((error) => error.source === source)
          const sources = [
            succeeded("tscircuit") && "tscircuit registry",
            succeeded("jlcpcb") && "JLCPCB",
            succeeded("ti") && "Texas Instruments",
            succeeded("datasheets") && "datasheet catalog",
            ...distributors
              .filter((d) => succeeded(d.source))
              .map((d) => d.label),
            succeeded("kicad") && "KiCad",
          ].filter(Boolean)
          console.log(
            kleur.yellow(
              `No results found for "${query}" in ${sources.join(", ")}.`,
            ),
          )
          return
        }

        if (datasheetResults.length) {
          console.log(
            kleur
              .bold()
              .underline(
                `Found ${datasheetResults.length} part(s) in the datasheet catalog:`,
              ),
          )
          datasheetResults.forEach((datasheet, idx) => {
            console.log(`${idx + 1}. ${datasheet.chip_name}`)
          })
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
