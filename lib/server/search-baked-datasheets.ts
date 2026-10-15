import Fuse from "fuse.js"

export interface BakedDatasheetSearchResult {
  mfr: string
  description: string
  supplier_part_numbers: Record<string, string[]> | null
  can_import: boolean
}

export const createBakedDatasheetSearch = (
  readResponse: (requestUrl: string) => Promise<unknown>,
) => {
  let index: Promise<Fuse<BakedDatasheetSearchResult>> | undefined
  const load = async () => {
    const { datasheets } = (await readResponse(
      "/datasheet-api/datasheets/list",
    )) as { datasheets: Array<{ datasheet_id: string }> }
    const parts = await Promise.all(
      datasheets.map(async ({ datasheet_id }) => {
        const query = new URLSearchParams({ datasheet_id })
        const { datasheet } = (await readResponse(
          `/datasheet-api/datasheets/get?${query}`,
        )) as {
          datasheet: {
            chip_name: string
            ai_description?: string | null
            supplier_part_numbers?: Record<string, string[]> | null
            generated_tsx?: unknown
          }
        }
        return {
          mfr: datasheet.chip_name,
          description: datasheet.ai_description ?? "",
          supplier_part_numbers: datasheet.supplier_part_numbers ?? null,
          can_import:
            typeof datasheet.generated_tsx === "string" &&
            Boolean(datasheet.generated_tsx.trim()),
        }
      }),
    )
    return new Fuse(parts, {
      keys: [
        "mfr",
        "supplier_part_numbers.jlcpcb",
        "supplier_part_numbers.digikey",
        "supplier_part_numbers.mouser",
        "description",
      ],
      ignoreLocation: true,
      threshold: 0.3,
    })
  }
  return async (query: string) =>
    (await (index ??= load()))
      .search(query, { limit: 10 })
      .map(({ item }) => item)
}
