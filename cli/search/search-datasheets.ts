import { getRegistryApiUrl } from "lib/cli-config"
import { getPlatformFetch } from "lib/shared/get-platform-fetch"
import { getPartsEngineBaseUrl } from "lib/shared/parts-engine-base-urls"
import { z } from "zod"

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
): Promise<DatasheetSearchResult[]> => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []
  const baseUrl = getPartsEngineBaseUrl("datasheet-api", getRegistryApiUrl())
  // Search the inventory locally so the same API works with static mirrors.
  const response = await getPlatformFetch()(`${baseUrl}/datasheets/list`, {
    headers: { accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(10_000),
  })
  if (!response.ok)
    throw new Error(`Datasheet search failed (HTTP ${response.status})`)
  const parsed = responseSchema.safeParse(await response.json())
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
