import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { getPlatformConfig } from "@tscircuit/eval/platform-config"
import type { PlatformConfig } from "@tscircuit/props"
import semver from "semver"
import { mergePlatformConfigs } from "./platform-config-utils"
import { getPlatformFetch } from "./get-platform-fetch"

export function createLocalCacheEngine(
  cacheDir = path.join(process.cwd(), ".tscircuit", "cache"),
) {
  return {
    getItem: (key: string): string | null => {
      try {
        const hash = createHash("md5").update(key).digest("hex")
        const keyWithSafeCharacters = key.replace(/[^a-zA-Z0-9]/g, "_")
        const filePath = path.join(
          cacheDir,
          `${keyWithSafeCharacters.slice(keyWithSafeCharacters.length - 10, keyWithSafeCharacters.length)}-${hash}.json`,
        )
        return fs.readFileSync(filePath, "utf-8")
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        fs.mkdirSync(cacheDir, { recursive: true })
        const hash = createHash("md5").update(key).digest("hex")
        const keyWithSafeCharacters = key.replace(/[^a-zA-Z0-9]/g, "_")
        const filePath = path.join(
          cacheDir,
          `${keyWithSafeCharacters.slice(keyWithSafeCharacters.length - 10, keyWithSafeCharacters.length)}-${hash}.json`,
        )
        fs.writeFileSync(filePath, value)
      } catch {
        // Silently ignore write errors
      }
    },
  }
}

/**
 * Get a platform config with CLI defaults, KiCad parsing support, and any user overrides.
 * The project directory keeps persistent caches stable across CLI commands and
 * worker modes, even when they run with different working directories.
 * This handles the conversion of absolute file paths to file:// URLs for Bun's fetch.
 * When Bun imports a .kicad_mod file, it returns an absolute path like "/path/to/file.kicad_mod".
 * The default loadFromUrl expects a URL, so we wrap it to convert paths to file:// URLs.
 * This should be used by command handlers before passing config to generateCircuitJson.
 */
export function getPlatformConfigWithCliDefaults(
  userConfig?: PlatformConfig,
  options?: { projectDir?: string },
): PlatformConfig {
  const projectDir = options?.projectDir ?? process.cwd()
  const basePlatformConfig = getPlatformConfig()
  const cacheDir = path.join(projectDir, ".tscircuit", "cache")

  const defaultConfig: PlatformConfig = {
    ...basePlatformConfig,
    // Bun's routing workers require 1.4.2; keep older hosts on inline routing.
    autorouterThreads:
      process.versions.bun && !semver.satisfies(process.versions.bun, ">=1.4.2")
        ? 1
        : 4,
    checkAvailability: true,
    localCacheEngine: createLocalCacheEngine(cacheDir),
    // Override footprintFileParserMap to handle file paths from native imports
    footprintFileParserMap: {
      ...basePlatformConfig.footprintFileParserMap,
      kicad_mod: {
        loadFromUrl: async (url: string) => {
          // Convert file paths to file:// URLs (or data: URLs under Node where fetch(file://) is unsupported)
          let localFilePath: string | null = null
          let fetchUrl = url
          if (url.startsWith("file:")) {
            localFilePath = fileURLToPath(url)
          } else if (url.startsWith("./") || url.startsWith("../")) {
            localFilePath = path.resolve(projectDir, url)
            fetchUrl = pathToFileURL(localFilePath).href
          } else if (path.isAbsolute(url) || url.startsWith("/")) {
            if (fs.existsSync(url)) {
              localFilePath = url
              fetchUrl = pathToFileURL(url).href
            } else if (url.startsWith("/")) {
              const relativePath = `.${url}`
              const absolutePath = path.resolve(projectDir, relativePath)
              if (fs.existsSync(absolutePath)) {
                localFilePath = absolutePath
                fetchUrl = pathToFileURL(absolutePath).href
              } else {
                fetchUrl = pathToFileURL(url).href
              }
            } else {
              fetchUrl = pathToFileURL(url).href
            }
          }

          if (
            typeof Bun === "undefined" &&
            localFilePath &&
            fs.existsSync(localFilePath)
          ) {
            const content = fs.readFileSync(localFilePath, "utf-8")
            fetchUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
          }

          // Delegate to the original loadFromUrl from eval
          return basePlatformConfig.footprintFileParserMap!.kicad_mod.loadFromUrl(
            fetchUrl,
          )
        },
      },
    },
  }

  const config = userConfig
    ? mergePlatformConfigs(defaultConfig, userConfig)!
    : defaultConfig
  if (process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL)
    config.platformFetch = getPlatformFetch(config.platformFetch)
  return config
}
