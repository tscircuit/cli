import pkg from "../../package.json"

/** Use the CLI's tested RunFrame version without the embedded eval worker. */
export function getRunFrameCdnUrl(): string {
  const version = pkg.devDependencies["@tscircuit/runframe"].replace(
    /^[^0-9]+/,
    "",
  )
  return `https://cdn.jsdelivr.net/npm/@tscircuit/runframe@${version}/dist/standalone.min.js`
}
