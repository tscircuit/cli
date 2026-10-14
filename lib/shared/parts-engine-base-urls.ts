export const partsEngineBaseUrlEnvVars = {
  jlcsearch: "TSCIRCUIT_JLCSEARCH_BASE_URL",
  digikey: "TSCIRCUIT_DIGIKEY_BASE_URL",
  mouser: "TSCIRCUIT_MOUSER_BASE_URL",
  "datasheet-api": "TSCIRCUIT_DATASHEET_API_BASE_URL",
} as const

export const getPartsEngineBaseUrl = (
  provider: keyof typeof partsEngineBaseUrlEnvVars,
  defaultBaseUrl: string,
) =>
  (process.env[partsEngineBaseUrlEnvVars[provider]] ?? defaultBaseUrl).replace(
    /\/+$/,
    "",
  )

export const getPartsEngineBaseUrls = (): Record<string, string> =>
  Object.fromEntries(
    Object.values(partsEngineBaseUrlEnvVars).flatMap((name) => {
      const baseUrl = process.env[name]
      return baseUrl === undefined ? [] : [[name, baseUrl]]
    }),
  )
