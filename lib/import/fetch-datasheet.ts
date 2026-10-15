import { commonComponentProps } from "@tscircuit/props"
import { getRegistryApiUrl } from "lib/cli-config"
import { getPartsEngineBaseUrl } from "lib/shared/parts-engine-base-urls"
import { z } from "zod"
import { getPlatformFetch } from "lib/shared/get-platform-fetch"

const responseSchema = z.object({
  datasheet: z.object({
    chip_name: z.string(),
    internally_connected_pins: z
      .array(z.array(z.union([z.string(), z.number()])))
      .nullish(),
    pin_attributes: commonComponentProps.shape.pinAttributes.nullable(),
    generated_tsx: z.unknown().optional(),
  }),
})

// Matches the datasheet API's chip-name normalization.
const normalizeChipName = (name: string) =>
  name.replace(/[^0-9a-zA-Z_-]/g, "").toLowerCase()

export const fetchDatasheet = async (
  manufacturerPartNumber: string | null | undefined,
  signal?: AbortSignal,
) => {
  if (!manufacturerPartNumber) return undefined
  const chipName = normalizeChipName(manufacturerPartNumber)
  if (!/[a-z0-9]/.test(chipName)) return undefined

  const baseUrl = getPartsEngineBaseUrl("datasheet-api", getRegistryApiUrl())
  const url = new URL(`${baseUrl}/datasheets/get`)
  url.searchParams.set("chip_name", chipName)
  const response = await getPlatformFetch()(url, {
    signal: signal ?? AbortSignal.timeout(5_000),
  })
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const parsed = responseSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error("invalid datasheet response")
  const { datasheet } = parsed.data
  if (normalizeChipName(datasheet.chip_name) !== chipName) {
    throw new Error("datasheet manufacturer part number does not match")
  }
  return datasheet
}
