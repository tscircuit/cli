import pkg from "../../package.json"

/** Use the CLI's tested RunFrame version without the embedded eval worker. */
export function getRunFrameCdnUrl({ previewOnly = false } = {}): string {
  const version = pkg.devDependencies["@tscircuit/runframe"].replace(
    /^[^0-9]+/,
    "",
  )
  const filename = previewOnly
    ? "standalone-preview.min.js"
    : "standalone.min.js"
  return `https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${version}/dist/${filename}`
}
