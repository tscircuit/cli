import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pkg from "../package.json"

export const resolveCliVersionFromStartDir = (
  startDir: string,
  fallbackVersion: string = pkg.version,
): string => {
  let currentDir = path.resolve(startDir)

  for (let depth = 0; depth < 6; depth += 1) {
    const packageJsonPath = path.join(currentDir, "package.json")
    try {
      if (fs.existsSync(packageJsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
          name?: string
          version?: string
        }
        if (
          parsed.name === "@tscircuit/cli" &&
          typeof parsed.version === "string" &&
          parsed.version.trim().length > 0
        ) {
          return parsed.version.trim()
        }
      }
    } catch {
      // Keep walking up if a package.json file cannot be read
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break
    currentDir = parentDir
  }

  return fallbackVersion
}

export const getCliVersion = (): string => {
  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url))
    return resolveCliVersionFromStartDir(moduleDir, pkg.version)
  } catch {
    return pkg.version
  }
}
