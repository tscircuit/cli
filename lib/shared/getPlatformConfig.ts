import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig as getEvalPlatformConfig } from "@tscircuit/eval"

/**
 * Get platform configuration for CLI build process.
 *
 * Extends @tscircuit/eval's getPlatformConfig to handle file paths that
 * @tscircuit/core passes (which are plain paths, not file:// URLs).
 * Bun's fetch() requires proper file:// URLs.
 */
export function getPlatformConfig(): PlatformConfig {
  const evalConfig = getEvalPlatformConfig()

  // Wrap the kicad_mod loader to convert plain paths to file:// URLs
  const originalKicadLoader = evalConfig.footprintFileParserMap?.kicad_mod

  return {
    ...evalConfig,
    footprintFileParserMap: {
      ...evalConfig.footprintFileParserMap,
      kicad_mod: {
        loadFromUrl: async (url: string) => {
          // Convert plain file paths to file:// URLs for Bun's fetch
          const fileUrl =
            url.startsWith("file://") || url.startsWith("http")
              ? url
              : `file://${url.startsWith("/") ? "" : "/"}${url}`

          return originalKicadLoader!.loadFromUrl(fileUrl)
        },
      },
    },
  }
}
