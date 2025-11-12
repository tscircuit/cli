import fs from "node:fs"
import path from "node:path"
import { globbySync } from "globby"

const DEFAULT_PATTERNS = [
  "**/*.{ts,tsx,js,jsx}",
]

const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.tsci/**",
]

const IMPORT_PATTERN = /["'`](@tsci\/[A-Za-z0-9._/-]+)["'`]/g

export interface CollectTsciDependenciesOptions {
  cwd?: string
  patterns?: string[]
  ignore?: string[]
}

export function collectTsciDependencies({
  cwd = process.cwd(),
  patterns = DEFAULT_PATTERNS,
  ignore = DEFAULT_IGNORES,
}: CollectTsciDependenciesOptions = {}) {
  const searchRoot = path.resolve(cwd)
  const files = globbySync(patterns, {
    cwd: searchRoot,
    absolute: true,
    ignore,
    gitignore: true,
  })

  const dependencies = new Set<string>()

  for (const filePath of files) {
    try {
      const fileContents = fs.readFileSync(filePath, "utf-8")
      let match: RegExpExecArray | null
      while (true) {
        match = IMPORT_PATTERN.exec(fileContents)
        if (match === null) break
        dependencies.add(match[1])
      }
    } catch (error) {
      // Ignore files that cannot be read
    }
  }

  return Array.from(dependencies)
}
