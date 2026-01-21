const TSCIRCUIT_NPMJS_API_URL = "https://registry.npmjs.org/tscircuit/latest"

export async function getLatestTscircuitCdnVersion(): Promise<string> {
  const response = await fetch(TSCIRCUIT_NPMJS_API_URL)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch tscircuit version from CDN: ${response.statusText}`,
    )
  }
  const data = (await response.json()) as { version: string }
  return data.version
}

export async function getLatestTscircuitCdnUrl(): Promise<string> {
  const version = await getLatestTscircuitCdnVersion()
  return `https://cdn.jsdelivr.net/npm/tscircuit@${version}/dist/browser.min.js`
}
