import { getRegistryApiUrl } from "lib/cli-config"
import { getPlatformFetch } from "lib/shared/get-platform-fetch"
import { getPartsEngineBaseUrl } from "lib/shared/parts-engine-base-urls"
import { z } from "zod"
import { readBakedSearchJson } from "./read-baked-search-json"

const responseSchema = z.object({
  datasheets: z.array(
    z.object({
      datasheet_id: z.string().min(1),
      chip_name: z.string().min(1),
    }),
  ),
})

export type DatasheetSearchResult = z.infer<
  typeof responseSchema
>["datasheets"][number]

export const searchDatasheets = async (
  query: string,
  signal?: AbortSignal,
  bakedDirectory?: string,
): Promise<DatasheetSearchResult[]> => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []
  const catalog = bakedDirectory
    ? await readBakedSearchJson(
        bakedDirectory,
        "datasheet-api/datasheets/list",
        signal,
      )
    : await fetchDatasheetIndex(signal)
  const parsed = responseSchema.safeParse(catalog)
  if (!parsed.success)
    throw new Error("Datasheet search returned an invalid response")
  return parsed.data.datasheets
    .filter(({ chip_name }) =>
      chip_name.toLowerCase().includes(normalizedQuery),
    )
    .sort(
      (a, b) =>
        Number(b.chip_name.toLowerCase() === normalizedQuery) -
          Number(a.chip_name.toLowerCase() === normalizedQuery) ||
        a.chip_name.localeCompare(b.chip_name, "en") ||
        a.datasheet_id.localeCompare(b.datasheet_id, "en"),
    )
    .slice(0, 10)
}

const fetchDatasheetIndex = async (signal?: AbortSignal): Promise<unknown> => {
  const baseUrl = getPartsEngineBaseUrl("datasheet-api", getRegistryApiUrl())
  const response = await getPlatformFetch()(`${baseUrl}/datasheets/list`, {
    headers: { accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(10_000),
  })
  if (!response.ok)
    throw new Error(`Datasheet search failed (HTTP ${response.status})`)
  return response.json()
}
