import { partsEngineBaseUrlEnvVars } from "../../lib/shared/parts-engine-base-urls"

// Keep external catalogs deterministic while the command uses the fixture's registry server.
for (const name of [
  "TSCIRCUIT_DEFAULT_SEARCH_SOURCES",
  "TSCIRCUIT_BAKED_ASSET_SERVER_DIR",
  "TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL",
  ...Object.values(partsEngineBaseUrlEnvVars),
])
  Reflect.deleteProperty(process.env, name)

const optionsFile = Bun.file("search-fixture.json")
const options: { failMouser?: boolean } = (await optionsFile.exists())
  ? await optionsFile.json()
  : {}
const upstreamFetch = globalThis.fetch

globalThis.fetch = Object.assign(
  async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    if (url.pathname.endsWith("/packages/search"))
      return upstreamFetch(input, init)
    if (url.pathname.endsWith("/datasheets/list"))
      return Response.json({
        datasheets: ["NE555P", "A-NE555", "NE555"].map((chip_name) => ({
          datasheet_id: `datasheet-${chip_name}`,
          chip_name,
        })),
      })
    if (url.pathname.endsWith("/kicad_files.json"))
      return Response.json(["Timer.pretty/NE555.kicad_mod"])
    if (/^(jlc|ti|digikey|mouser)search\.tscircuit\.com$/.test(url.hostname)) {
      if (options.failMouser && url.hostname === "mousersearch.tscircuit.com")
        return new Response(null, { status: 503 })
      return Response.json({
        components: [
          {
            mfr: "NE555P",
            lcsc: 5976,
            package: "DIP-8",
            description: "Precision timer",
            stock: 1000,
            supplier_part_number: "NE555P-test",
          },
        ],
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  },
  upstreamFetch,
)
