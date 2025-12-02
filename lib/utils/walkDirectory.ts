import path from "node:path"
import fs from "node:fs"

/**
 * Directories that should be excluded when collecting package files
 */
const EXCLUDED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "coverage",
  ".cache",
  "tmp",
  "temp",
])

/**
 * Recursively walks a directory and collects all file paths.
 * Skips directories in the excluded set.
 */
export function walkDirectory(
  dir: string,
  excludedDirs: Set<string> = EXCLUDED_DIRECTORIES,
): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) {
        continue
      }
      files.push(...walkDirectory(fullPath, excludedDirs))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}
