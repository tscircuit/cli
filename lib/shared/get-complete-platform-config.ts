import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig } from "@tscircuit/eval/platform-config"

/**
 * Get a complete platform config with KiCad parsing support and any user overrides
 * This should be used by command handlers before passing config to generateCircuitJson
 */
export function getCompletePlatformConfig(
  userConfig?: PlatformConfig,
): PlatformConfig {
  const defaultConfig = {
    ...getPlatformConfig(),
    projectBaseUrl: "file://",
  }

  if (!userConfig) {
    return defaultConfig
  }

  // Merge user config with defaults, ensuring nested objects are properly merged
  return {
    ...defaultConfig,
    ...userConfig,
    // Merge nested objects
    footprintFileParserMap: {
      ...defaultConfig.footprintFileParserMap,
      ...userConfig.footprintFileParserMap,
    },
  }
}
