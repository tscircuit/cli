import pkg from "../package.json"
import semver from "semver"

// HACK: at build time the version is old (a patch release behind), we need to
// fix this at some point...
export const getVersion = () => {
  return semver.inc(pkg.version, "patch") ?? pkg.version
}
