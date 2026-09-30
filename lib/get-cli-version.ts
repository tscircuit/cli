import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pkg from "../package.json"

export const getCliVersion = () => {
  let directory = dirname(fileURLToPath(import.meta.url))

  // The release build runs before the version bump. Read the installed
  // manifest rather than relying on the package.json bundled into the build.
  while (true) {
    try {
      const manifest = JSON.parse(
        readFileSync(join(directory, "package.json"), "utf8"),
      )
      if (
        manifest.name === "@tscircuit/cli" &&
        typeof manifest.version === "string"
      ) {
        return manifest.version
      }
    } catch {
      // Source files and bundles can live at different depths in the package.
    }

    const parent = dirname(directory)
    if (parent === directory) return pkg.version
    directory = parent
  }
}
