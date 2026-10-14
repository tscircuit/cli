import { fetchDatasheet } from "./fetch-datasheet"

export const fetchDatasheetPinAttributes = async (
  manufacturerPartNumber: string | null | undefined,
) => {
  if (!manufacturerPartNumber) return undefined

  const signal = AbortSignal.timeout(5_000)
  try {
    return (
      (await fetchDatasheet(manufacturerPartNumber, signal))?.pin_attributes ??
      undefined
    )
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
