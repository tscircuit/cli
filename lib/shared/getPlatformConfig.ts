import type { PlatformConfig } from "@tscircuit/props"
import { getPlatformConfig as getEvalPlatformConfig } from "@tscircuit/eval"

/**
 * Get platform configuration for CLI build process.
 * 
 * Simply uses eval's config and sets projectBaseUrl to "file://" so that
 * core generates proper file:// URLs (just like the dev server does with http://).
 */
export function getPlatformConfig(): PlatformConfig {
  return {
    ...getEvalPlatformConfig(),
    projectBaseUrl: "file://",
  }
}
