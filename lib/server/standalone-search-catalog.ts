import { readFile, realpath } from "node:fs/promises"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import { isWithinDirectory } from "lib/shared/jscdn-directory"
import { z } from "zod"

const componentSchema = z.object({
  mfr: z.string().min(1),
  package: z.string(),
  description: z.string(),
  stock: z.number().nonnegative().nullable(),
  price: z.number().nonnegative().nullable(),
  lcsc: z.number().int().positive().nullable().optional(),
  supplier_part_number: z.string().optional(),
  digikey_product_number: z.string().optional(),
  mouser_product_number: z.string().optional(),
  ti_product_number: z.string().optional(),
  manufacturer: z.string().optional(),
  product_url: z.string().optional(),
  datasheet_url: z.string().optional(),
  is_basic: z.boolean().optional(),
  is_preferred: z.boolean().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
})
const catalogSchema = z.object({
  schema_version: z.literal(1),
  source: z.enum(["jlcpcb", "digikey", "mouser", "ti", "kicad", "tscircuit"]),
  coverage: z.literal("subset"),
  generated_at: z.string().datetime(),
  components: z.array(componentSchema).optional(),
  files: z.array(z.string()).optional(),
  packages: z
    .array(
      z.object({
        name: z.string().min(1),
        version: z.string(),
        description: z.string().optional(),
        star_count: z.number().optional(),
      }),
    )
    .optional(),
})

type Catalog = z.infer<typeof catalogSchema>
const providers = {
  jlcsearch: "jlcpcb",
  digikey: "digikey",
  mouser: "mouser",
  ti: "ti",
  kicad: "kicad",
  tscircuit: "tscircuit",
} as const

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "")

/** One cache per server; never reads a user-supplied path or fetches a remote URL. */
export function createStandaloneSearchHandler(rootDirectory: string) {
  const catalogs = new Map<string, Promise<Catalog | undefined>>()
  const load = (provider: keyof typeof providers) => {
    let pending = catalogs.get(provider)
    if (!pending) {
      pending = (async () => {
        let filename: string
        try {
          filename = await realpath(
            path.join(rootDirectory, provider, "search-catalog.json.gz"),
          )
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT")
            return undefined
          throw error
        }
        if (!isWithinDirectory(rootDirectory, filename))
          throw new Error("Invalid catalog path")
        const catalog = catalogSchema.parse(
          JSON.parse(
            gunzipSync(await readFile(filename), {
              maxOutputLength: 32 * 1024 * 1024,
            }).toString("utf8"),
          ),
        )
        if (catalog.source !== providers[provider])
          throw new Error("Catalog source mismatch")
        const entries =
          provider === "kicad"
            ? catalog.files
            : provider === "tscircuit"
              ? catalog.packages
              : catalog.components
        if (!entries?.length)
          throw new Error("Empty or missing catalog entries")
        if (
          provider === "jlcsearch" &&
          catalog.components!.some((row) => !row.lcsc)
        )
          throw new Error("JLCPCB catalog is missing LCSC identities")
        return catalog
      })()
      catalogs.set(provider, pending)
    }
    return pending
  }
  return async (
    url: URL,
    registryQuery?: string,
  ): Promise<Response | undefined> => {
    const match = /^\/(jlcsearch|digikey|mouser|ti)\/api\/search$/.exec(
      url.pathname,
    )
    const provider =
      (match?.[1] as keyof typeof providers | undefined) ??
      (url.pathname === "/kicad/kicad_files.json"
        ? "kicad"
        : /^\/[^/]+\/(?:api\/)?packages\/search$/.test(url.pathname)
          ? "tscircuit"
          : undefined)
    if (!provider) return undefined
    const catalog = await load(provider)
    // Preserve older bundles containing exact URL responses.
    if (!catalog) return undefined
    const metadata = {
      source: catalog.source,
      coverage: catalog.coverage,
      generated_at: catalog.generated_at,
    }
    const headers = { "x-tscircuit-catalog": JSON.stringify(metadata) }
    if (provider === "kicad") return Response.json(catalog.files, { headers })
    const query = (registryQuery ?? url.searchParams.get("q") ?? "").trim()
    const tokens = query.toLowerCase().match(/[a-z0-9]+/g) ?? []
    const exact = normalize(query)
    const requestedLimit = Number(url.searchParams.get("limit") ?? 10)
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1)
      return Response.json(
        { error: "limit must be a positive integer" },
        { status: 400 },
      )
    const limit = Math.min(requestedLimit, 100)
    if (provider === "tscircuit") {
      const packages = catalog
        .packages!.filter((row) =>
          tokens.every((token) =>
            `${row.name} ${row.description ?? ""}`
              .toLowerCase()
              .includes(token),
          ),
        )
        .sort(
          (a, b) =>
            Number(normalize(b.name.split("/").at(-1)!) === exact) -
              Number(normalize(a.name.split("/").at(-1)!) === exact) ||
            (b.star_count ?? 0) - (a.star_count ?? 0) ||
            a.name.localeCompare(b.name),
        )
        .slice(0, limit)
      return Response.json({ packages, catalog: metadata }, { headers })
    }
    const supported = new Set([
      "q",
      "limit",
      "package",
      "subcategory_name",
      "is_basic",
      "is_preferred",
    ])
    if ([...url.searchParams.keys()].some((key) => !supported.has(key)))
      return Response.json(
        { error: "Unsupported filter in offline catalog" },
        { status: 400 },
      )
    const lcsc =
      provider === "jlcsearch" && /^c?\d+$/i.test(query)
        ? Number(query.replace(/^c/i, ""))
        : undefined
    const identities = (row: z.infer<typeof componentSchema>) =>
      [
        row.mfr,
        row.supplier_part_number,
        row.digikey_product_number,
        row.mouser_product_number,
        row.ti_product_number,
      ].filter((value): value is string => Boolean(value))
    const isExact = (row: z.infer<typeof componentSchema>) =>
      identities(row).some((value) => normalize(value) === exact)
    const components = catalog
      .components!.filter((row) => {
        if (
          lcsc !== undefined
            ? row.lcsc !== lcsc
            : !isExact(row) &&
              !tokens.every((token) =>
                `${identities(row).join(" ")} ${row.description} ${row.package} ${row.manufacturer ?? ""} ${row.category ?? ""} ${row.subcategory ?? ""}`
                  .toLowerCase()
                  .includes(token),
              )
        )
          return false
        if (
          url.searchParams.has("package") &&
          row.package !== url.searchParams.get("package")
        )
          return false
        if (
          url.searchParams.has("subcategory_name") &&
          row.subcategory !== url.searchParams.get("subcategory_name")
        )
          return false
        for (const field of ["is_basic", "is_preferred"] as const) {
          if (
            ["true", "1"].includes(url.searchParams.get(field) ?? "") &&
            row[field] !== true
          )
            return false
        }
        return true
      })
      .sort(
        (a, b) =>
          Number(isExact(b)) - Number(isExact(a)) ||
          (b.stock ?? -1) - (a.stock ?? -1) ||
          a.mfr.localeCompare(b.mfr) ||
          String(a.lcsc ?? a.supplier_part_number).localeCompare(
            String(b.lcsc ?? b.supplier_part_number),
          ),
      )
      .slice(0, limit)
    return Response.json({ components, catalog: metadata }, { headers })
  }
}
