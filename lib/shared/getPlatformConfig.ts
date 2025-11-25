import type { PlatformConfig } from "@tscircuit/props"

/**
 * Get platform configuration for CLI build process.
 *
 * Lazy loads eval's config and sets projectBaseUrl to "file://" so that
 * core generates proper file:// URLs (just like the dev server does with http://).
 */
export async function getPlatformConfig(): Promise<PlatformConfig> {
  const { getPlatformConfig: getEvalPlatformConfig } = await import(
    "@tscircuit/eval"
  )

  return {
    ...getEvalPlatformConfig(),
    projectBaseUrl: "file://",
  }
}
