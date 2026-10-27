import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { resolve } from "import-meta-resolve"

/** Resolve through tscircuit, including packages that do not export package.json. */
export function getTscircuitDependencyVersion(packageName: string): string {
  const tscircuitEntry = resolve("tscircuit", import.meta.url)
  const dependencyEntry = resolve(packageName, tscircuitEntry)
  let directory = path.dirname(fileURLToPath(dependencyEntry))
  while (directory !== path.dirname(directory)) {
    const manifestPath = path.join(directory, "package.json")
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      if (
        manifest.name === packageName &&
        typeof manifest.version === "string"
      ) {
        return manifest.version
      }
    }
    directory = path.dirname(directory)
  }
  throw new Error(`Cannot find the installed version of ${packageName}`)
}
