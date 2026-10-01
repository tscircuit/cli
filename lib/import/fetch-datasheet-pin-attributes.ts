import { commonComponentProps } from "@tscircuit/props"
import { getRegistryApiUrl } from "lib/cli-config"
import { z } from "zod"

const responseSchema = z.object({
  datasheet: z.object({
    chip_name: z.string(),
    pin_attributes: commonComponentProps.shape.pinAttributes.nullable(),
  }),
})

// Matches the datasheet API's chip-name normalization.
const normalizeChipName = (name: string) =>
  name.replace(/[^0-9a-zA-Z_-]/g, "").toLowerCase()

export const fetchDatasheetPinAttributes = async (
  manufacturerPartNumber: string | null | undefined,
) => {
  if (!manufacturerPartNumber) return undefined
  const chipName = normalizeChipName(manufacturerPartNumber)
  if (!/[a-z0-9]/.test(chipName)) return undefined

  try {
    const url = new URL(
      `${getRegistryApiUrl().replace(/\/$/, "")}/datasheets/get`,
    )
    url.searchParams.set("chip_name", chipName)
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const parsed = responseSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error("invalid datasheet response")
    const { datasheet } = parsed.data
    if (normalizeChipName(datasheet.chip_name) !== chipName) {
      throw new Error("datasheet manufacturer part number does not match")
    }
    return datasheet.pin_attributes ?? undefined
  } catch (error) {
    console.warn(
      `Could not load datasheet pin attributes for ${manufacturerPartNumber}: ${error instanceof Error ? error.message : "request failed"}. Continuing with imported attributes.`,
    )
    return undefined
  }
}
