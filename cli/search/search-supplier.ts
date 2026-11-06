import { getPartsEngineBaseUrl } from "lib/shared/parts-engine-base-urls"
import { readBakedSearchJson } from "./read-baked-search-json"

export const searchSupplier = async <Component>(
  provider: "jlcsearch" | "digikey" | "mouser",
  label: string,
  query: string,
  signal: AbortSignal,
  bakedDirectory?: string,
): Promise<Component[]> => {
  const endpoint = `/api/search?limit=10&q=${encodeURIComponent(query)}`
  let data: unknown
  if (bakedDirectory) {
    data = await readBakedSearchJson(
      bakedDirectory,
      provider + endpoint,
      signal,
    )
  } else {
    const baseUrl = getPartsEngineBaseUrl(
      provider,
      `https://${provider === "jlcsearch" ? provider : `${provider}search`}.tscircuit.com`,
    )
    const response = await fetch(baseUrl + endpoint, {
      headers:
        provider === "jlcsearch" ? undefined : { accept: "application/json" },
      signal,
    })
    if (!response.ok)
      throw new Error(`${label} search failed (HTTP ${response.status})`)
    data = await response.json()
  }
  const components = (data as { components?: unknown } | null)?.components
  if (!Array.isArray(components)) {
    throw new Error(`${label} search returned an invalid response`)
  }
  return components
}
