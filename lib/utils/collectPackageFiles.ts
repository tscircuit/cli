import path from "node:path"
import fs from "node:fs"
import { walkDirectory } from "./walkDirectory"

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
 * Collects all files from a package directory.
 * Prioritizes transpiled files (dist/, build/) over source files to avoid
 * path alias resolution issues in the browser.
 */
export function collectPackageFiles(packageDir: string): string[] {
  const buildDirs = ["dist", "build"]

  // Check build directories first
  for (const dirName of buildDirs) {
    const dirPath = path.join(packageDir, dirName)
    if (fs.existsSync(dirPath)) {
      const files = walkDirectory(dirPath, new Set())
      if (files.length > 0) {
        // Also include package.json for metadata if it exists
        const packageJsonPath = path.join(packageDir, "package.json")
        if (fs.existsSync(packageJsonPath)) {
          files.push(packageJsonPath)
        }
        return files
      }
    }
  }

  // Fall back to collecting all source files (excluding build directories)
  return walkDirectory(packageDir, EXCLUDED_DIRECTORIES)
}
