import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "@tscircuit/eval/platform-config"
import { createHash } from "node:crypto"
import path from "node:path"
import fs from "node:fs"

export function createFilesystemCache(
  cacheDir = path.join(process.cwd(), ".tscircuit", "cache", "parts-engine"),
) {
  return {
    get: (key: string): string | null => {
      try {
        const hash = createHash("sha256").update(key).digest("hex")
        const filePath = path.join(cacheDir, `${hash}.json`)
        return fs.readFileSync(filePath, "utf-8")
      } catch {
        return null
      }
    },
    set: (key: string, value: string): void => {
      try {
        fs.mkdirSync(cacheDir, { recursive: true })
        const hash = createHash("sha256").update(key).digest("hex")
        const filePath = path.join(cacheDir, `${hash}.json`)
        fs.writeFileSync(filePath, value)
      } catch {
        // Silently ignore write errors
      }
    },
  }
}

/**
 * Get a complete platform config with KiCad parsing support and any user overrides.
 * This handles the conversion of absolute file paths to file:// URLs for Bun's fetch.
 * When Bun imports a .kicad_mod file, it returns an absolute path like "/path/to/file.kicad_mod".
 * The default loadFromUrl expects a URL, so we wrap it to convert paths to file:// URLs.
 * This should be used by command handlers before passing config to generateCircuitJson.
 */
export function getCompletePlatformConfig(
  userConfig?: PlatformConfig,
): PlatformConfig {
  const basePlatformConfig = getPlatformConfig({
    filesystemCache: createFilesystemCache(),
  })

  const defaultConfig: PlatformConfig = {
    ...basePlatformConfig,
    // Override footprintFileParserMap to handle file paths from native imports
    footprintFileParserMap: {
      ...basePlatformConfig.footprintFileParserMap,
      kicad_mod: {
        loadFromUrl: async (url: string) => {
          // Convert file paths to file:// URLs for Bun's fetch
          let fetchUrl = url
          if (url.startsWith("./") || url.startsWith("../")) {
            // Relative path - resolve to absolute first
            const absolutePath = path.resolve(process.cwd(), url)
            fetchUrl = `file://${absolutePath}`
          } else if (url.startsWith("/")) {
            // Absolute path - check if it exists, otherwise try resolving as relative
            if (fs.existsSync(url)) {
              fetchUrl = `file://${url}`
            } else {
              // Try treating it as a relative path (strip leading / and resolve from cwd)
              const relativePath = `.${url}`
              const absolutePath = path.resolve(process.cwd(), relativePath)
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

  if (!userConfig) {
    return defaultConfig
  }

  // Merge user config with defaults, ensuring nested objects are properly merged
  return {
    ...defaultConfig,
    ...userConfig,
    // If user provides footprintFileParserMap, merge it with our defaults
    footprintFileParserMap: {
      ...defaultConfig.footprintFileParserMap,
      ...userConfig.footprintFileParserMap,
    },
  }
}
