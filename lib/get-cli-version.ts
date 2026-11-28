import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import pkg from "../package.json"

export const getCliVersion = (
  startDir: string = dirname(fileURLToPath(import.meta.url)),
): string => {
  let currentDir = resolve(startDir)

  while (true) {
    const manifestPath = join(currentDir, "package.json")
    try {
      const manifestText = readFileSync(manifestPath, "utf8")
      const parsedManifest: { name?: unknown; version?: unknown } =
        JSON.parse(manifestText)
      if (
        parsedManifest &&
        typeof parsedManifest === "object" &&
        parsedManifest.name === "@tscircuit/cli" &&
        typeof parsedManifest.version === "string" &&
        parsedManifest.version.trim().length > 0
      ) {
        return parsedManifest.version.trim()
      }
    } catch {
      // Continue walking upward if no readable package.json exists here.
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) break
    currentDir = parentDir
  }

  return pkg.version
}
