import type { PlatformConfig } from "@tscircuit/props"

/**
 * Get platform configuration for CLI build process.
 *
 * Lazy loads @tscircuit/eval to avoid import errors when tscircuit
 * is not yet installed (e.g., during `tsci init`).
 */
export function getPlatformConfig(): PlatformConfig {
  // Lazy import eval - will only run when actually building/using KiCad footprints
  const {
    getPlatformConfig: getEvalPlatformConfig,
  } = require("@tscircuit/eval")
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
