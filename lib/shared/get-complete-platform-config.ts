import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "@tscircuit/eval/platform-config"

/**
 * Get a complete platform config with KiCad parsing support and any user overrides.
 * This handles the conversion of absolute file paths to file:// URLs for Bun's fetch.
 *
 * When Bun imports a .kicad_mod file, it returns an absolute path like "/path/to/file.kicad_mod".
 * The default loadFromUrl expects a URL, so we wrap it to convert paths to file:// URLs.
 *
 * This should be used by command handlers before passing config to generateCircuitJson.
 */
export function getCompletePlatformConfig(
  userConfig?: PlatformConfig,
): PlatformConfig {
  const basePlatformConfig = getPlatformConfig()

  const defaultConfig: PlatformConfig = {
    ...basePlatformConfig,
    // Override footprintFileParserMap to handle absolute file paths from native imports
    footprintFileParserMap: {
      ...basePlatformConfig.footprintFileParserMap,
      kicad_mod: {
        loadFromUrl: async (url: string) => {
          // Convert absolute file paths to file:// URLs for Bun's fetch
          const fetchUrl = url.startsWith("/") ? `file://${url}` : url
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
