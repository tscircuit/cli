const RUNFRAME_NPMJS_API_URL =
  "https://registry.npmjs.org/@tscircuit/runframe/latest"

/** Resolve the latest RunFrame release and pin its standalone viewer URL. */
export async function getRunFrameCdnUrl(): Promise<string> {
  const response = await fetch(RUNFRAME_NPMJS_API_URL)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch RunFrame version from npm: ${response.statusText}`,
    )
  }
  const { version } = (await response.json()) as { version?: unknown }
  if (typeof version !== "string" || !version) {
    throw new Error("npm returned an invalid RunFrame version")
  }
  return `https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${version}/dist/standalone.min.js`
}
