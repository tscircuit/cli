import type { PlatformConfig } from "@tscircuit/props"

/**
 * Get platform configuration for CLI build process.
 *
 * Lazy loads @tscircuit/eval to avoid import errors when tscircuit
 * is not yet installed (e.g., during `tsci init`).
 */
export async function getPlatformConfig(): Promise<PlatformConfig> {
  // Lazy import eval - will only run when actually building/using KiCad footprints
  let evalConfig: any
  try {
    const evalModule = await import("@tscircuit/eval")
    evalConfig = evalModule.getPlatformConfig()
  } catch (error) {
    // If eval is not available, return minimal config
    return {
      footprintFileParserMap: {},
    }
  }

  // Wrap the kicad_mod loader to convert plain paths to file:// URLs
  const originalKicadLoader = evalConfig.footprintFileParserMap?.kicad_mod

  return {
    ...evalConfig,
    footprintFileParserMap: {
      ...evalConfig.footprintFileParserMap,
      kicad_mod: originalKicadLoader
        ? {
            loadFromUrl: async (url: string) => {
              // Convert plain file paths to file:// URLs for Bun's fetch
              const fileUrl =
                url.startsWith("file://") || url.startsWith("http")
                  ? url
                  : `file://${url.startsWith("/") ? "" : "/"}${url}`

              return originalKicadLoader!.loadFromUrl(fileUrl)
            },
          }
        : undefined,
    },
  }
}
