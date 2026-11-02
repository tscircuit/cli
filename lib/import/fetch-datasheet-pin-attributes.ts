import { fetchDatasheet } from "./fetch-datasheet"

export const fetchDatasheetMetadata = async (
  manufacturerPartNumber: string | null | undefined,
) => {
  if (!manufacturerPartNumber) return undefined

  const signal = AbortSignal.timeout(5_000)
  try {
    const datasheet = await fetchDatasheet(manufacturerPartNumber, signal)
    if (!datasheet) return undefined
    return {
      pinAttributes: datasheet.pin_attributes ?? undefined,
      internallyConnectedPins: datasheet.internally_connected_pins ?? undefined,
    }
  } catch (error) {
    const message =
      signal.aborted ||
      (error instanceof Error && error.name === "TimeoutError")
        ? `Datasheet API did not respond within 5 seconds for ${manufacturerPartNumber}`
        : `Could not load datasheet pin attributes for ${manufacturerPartNumber}: ${error instanceof Error ? error.message : "request failed"}`
    console.warn(
      `${message}. pinAttributes may not be populated. Continuing with imported attributes.`,
    )
    return undefined
  }
}

/** Compatibility helper for callers requesting only electrical attributes. */
export const fetchDatasheetPinAttributes = async (
  manufacturerPartNumber: string | null | undefined,
) => (await fetchDatasheetMetadata(manufacturerPartNumber))?.pinAttributes
