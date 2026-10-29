import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { getPlatformConfig } from "@tscircuit/eval/platform-config"
import type { PlatformConfig } from "@tscircuit/props"
import { mergePlatformConfigs } from "./platform-config-utils"
import { getPlatformFetch } from "./get-platform-fetch"
import { getAlgorithmFnFingerprint } from "./algorithm-fn-fingerprint"

// Matches the `<source hash>-<dependency hash>` from getAlgorithmFnFingerprint
// inside core's `...:algorithm:<fingerprint>:srj:...` route cache keys.
const ALGORITHM_FN_CACHE_KEY_PATTERN = /:algorithm:([a-f0-9]+)-([a-f0-9]+):/
const ALGORITHM_FN_CACHE_FILE_PATTERN = /^algorithm-([a-f0-9]+)-([a-f0-9]+)-/

export function createLocalCacheEngine(
  cacheDir = path.join(process.cwd(), ".tscircuit", "cache"),
  options: { projectDir?: string } = {},
) {
  const getCacheFilePath = (key: string) => {
    const hash = createHash("md5").update(key).digest("hex")
    const algorithmFnMatch = key.match(ALGORITHM_FN_CACHE_KEY_PATTERN)
    if (algorithmFnMatch) {
      return path.join(
        cacheDir,
        `algorithm-${algorithmFnMatch[1]}-${algorithmFnMatch[2]}-${hash}.json`,
      )
    }
    const keyWithSafeCharacters = key.replace(/[^a-zA-Z0-9]/g, "_")
    return path.join(
      cacheDir,
      `${keyWithSafeCharacters.slice(keyWithSafeCharacters.length - 10, keyWithSafeCharacters.length)}-${hash}.json`,
    )
  }

  /** Deletes results cached for earlier versions of this algorithm's code. */
  const clearStaleAlgorithmFnCacheFiles = (fingerprint: string) => {
    const [sourceHash, dependencyHash] = fingerprint.split("-")
    try {
      for (const fileName of fs.readdirSync(cacheDir)) {
        const match = fileName.match(ALGORITHM_FN_CACHE_FILE_PATTERN)
        if (match?.[1] === sourceHash && match[2] !== dependencyHash) {
          fs.rmSync(path.join(cacheDir, fileName), { force: true })
        }
      }
    } catch {
      // The cache directory may not exist yet
    }
  }

  return {
    getItem: (key: string): string | null => {
      try {
        return fs.readFileSync(getCacheFilePath(key), "utf-8")
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        fs.mkdirSync(cacheDir, { recursive: true })
        fs.writeFileSync(getCacheFilePath(key), value)
      } catch {
        // Silently ignore write errors
      }
    },
    ...(options.projectDir
      ? {
          getAlgorithmFnFingerprint: (algorithmFn: Function): string | null => {
            try {
              const fingerprint = getAlgorithmFnFingerprint(
                algorithmFn,
                options.projectDir!,
              )
              if (fingerprint) clearStaleAlgorithmFnCacheFiles(fingerprint)
              return fingerprint
            } catch {
              return null
            }
          },
        }
      : {}),
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
    checkAvailability: true,
    localCacheEngine: createLocalCacheEngine(cacheDir, { projectDir }),
    // Override footprintFileParserMap to handle file paths from native imports
    footprintFileParserMap: {
      ...basePlatformConfig.footprintFileParserMap,
      kicad_mod: {
        loadFromUrl: async (url: string) => {
          // Convert file paths to file:// URLs for Bun's fetch
          let fetchUrl = url
          if (url.startsWith("./") || url.startsWith("../")) {
            // Relative path - resolve to absolute first
            const absolutePath = path.resolve(projectDir, url)
            fetchUrl = `file://${absolutePath}`
          } else if (url.startsWith("/")) {
            // Absolute path - check if it exists, otherwise try resolving as relative
            if (fs.existsSync(url)) {
              fetchUrl = `file://${url}`
            } else {
              // Try treating it as a relative path (strip leading / and resolve from cwd)
              const relativePath = `.${url}`
              const absolutePath = path.resolve(projectDir, relativePath)
              if (fs.existsSync(absolutePath)) {
                fetchUrl = `file://${absolutePath}`
              } else {
                // Fall back to original path
                fetchUrl = `file://${url}`
              }
            }
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
