/**
 * jscdn.tscircuit.com serves the bundle from R2. jsDelivr compresses each
 * version of this ~34 MB file on first request per edge location, which
 * regularly left pages waiting 30-90s (or timing out) before the viewer loaded.
 */
export const getRunFrameStandaloneCdnUrl = (version: string) =>
  `https://jscdn.tscircuit.com/@tscircuit/runframe/${version}/dist/standalone.min.js`
