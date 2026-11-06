import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

/** HTTP(S) proxies and file:// directories share the same resource interface. */
export const getPlatformBaseUrl = () => {
  // Retain the existing environment variables as compatibility aliases.
  const baseUrl =
    process.env.TSCIRCUIT_PLATFORM_BASE_URL ??
    process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL
  if (baseUrl !== undefined) {
    if (!baseUrl) throw new Error("Platform base URL must not be empty")
    const url = new URL(baseUrl)
    if (!["file:", "http:", "https:"].includes(url.protocol))
      throw new Error(`Unsupported platform URL protocol: ${url.protocol}`)
    return url.href.replace(/\/+$/, "")
  }
  const directory = process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR
  if (directory === undefined) return undefined
  if (!directory) throw new Error("Platform directory must not be empty")
  return pathToFileURL(resolve(directory)).href.replace(/\/+$/, "")
}
