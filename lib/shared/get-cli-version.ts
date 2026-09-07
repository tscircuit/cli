import { readFileSync } from "node:fs"
import semver from "semver"
import { version as bundledVersion } from "../../package.json"

export const getCliVersion = (): string => {
  try {
    // Both this source file and dist/{cli,lib} are two levels below the manifest.
    const manifest: unknown = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    )
    if (
      typeof manifest === "object" &&
      manifest !== null &&
      "name" in manifest &&
      manifest.name === "@tscircuit/cli" &&
      "version" in manifest &&
      typeof manifest.version === "string" &&
      semver.valid(manifest.version) !== null
    ) {
      return manifest.version
    }
    return bundledVersion
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        "code" in error &&
        ["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(String(error.code)))
    ) {
      return bundledVersion
    }
    throw error
  }
}
