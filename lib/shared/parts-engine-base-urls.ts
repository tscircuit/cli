export const partsEngineBaseUrlEnvVars = {
  jlcsearch: "TSCIRCUIT_JLCSEARCH_BASE_URL",
  digikey: "TSCIRCUIT_DIGIKEY_BASE_URL",
  mouser: "TSCIRCUIT_MOUSER_BASE_URL",
  "datasheet-api": "TSCIRCUIT_DATASHEET_API_BASE_URL",
} as const

export const getPartsEngineBaseUrl = (
  provider: keyof typeof partsEngineBaseUrlEnvVars,
  defaultBaseUrl: string,
) => {
  const environmentVariable = partsEngineBaseUrlEnvVars[provider]
  const baseUrl = process.env[environmentVariable] ?? defaultBaseUrl
  return baseUrl.replace(/\/+$/, "")
}

export const getPartsEngineBaseUrls = () => {
  const baseUrls: Record<string, string> = {}
  for (const environmentVariable of Object.values(partsEngineBaseUrlEnvVars)) {
    const baseUrl = process.env[environmentVariable]
    if (baseUrl !== undefined) baseUrls[environmentVariable] = baseUrl
  }
  return baseUrls
}
