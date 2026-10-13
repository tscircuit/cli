/**
 * Compatibility guard for bundles that predate the browser platform config
 * hook. The marker checks the API contract; it is not a security boundary.
 */
export const getRunframeStandaloneCompatibilityError = (
  content: string,
  source: string,
): string | undefined => {
  if (content.includes("TSCIRCUIT_PLATFORM_CONFIG")) return
  return `${source} contains a RunFrame version that does not support TSCIRCUIT_PLATFORM_CONFIG. Upgrade the selected tscircuit/RunFrame package, or set RUNFRAME_STANDALONE_FILE_PATH to a compatible RunFrame standalone bundle. Local browser dependencies and platform hooks cannot be applied to this older bundle.`
}
