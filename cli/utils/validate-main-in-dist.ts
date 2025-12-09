import fs from "node:fs"
import path from "node:path"

export const validateMainInDist = (projectDir: string, distDir: string) => {
  const packageJsonPath = path.join(projectDir, "package.json")
  if (!fs.existsSync(packageJsonPath)) return

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

  const hasMain = typeof packageJson.main === "string"
  const hasExports =
    typeof packageJson.exports === "object" && packageJson.exports !== null

  if (!hasMain && !hasExports) {
    throw new Error(
      'When using transpilation, your package.json must have either a "main" or "exports" field pointing to the output in the `dist/*` directory',
    )
  }

  if (hasMain) {
    const resolvedMainPath = path.resolve(projectDir, packageJson.main)
    const isMainInDist =
      resolvedMainPath === distDir ||
      resolvedMainPath.startsWith(`${distDir}${path.sep}`)

    if (!isMainInDist) {
      throw new Error(
        'When using transpilation, your package\'s "main" field must point inside the `dist/*` directory, usually to "dist/index.js"',
      )
    }
  }

  if (hasExports) {
    const isExportsValid = validateExports(
      packageJson.exports,
      projectDir,
      distDir,
    )
    if (!isExportsValid) {
      throw new Error(
        'When using transpilation, your package\'s "exports" field must point to outputs in the `dist/*` directory',
      )
    }
  }
}

const validateExports = (
  exports: any,
  projectDir: string,
  distDir: string,
): boolean => {
  if (typeof exports === "string") {
    const resolvedPath = path.resolve(projectDir, exports)
    return (
      resolvedPath === distDir ||
      resolvedPath.startsWith(`${distDir}${path.sep}`)
    )
  }

  if (typeof exports === "object" && exports !== null) {
    for (const key in exports) {
      const value = exports[key]

      if (typeof value === "string") {
        const resolvedPath = path.resolve(projectDir, value)
        const isInDist =
          resolvedPath === distDir ||
          resolvedPath.startsWith(`${distDir}${path.sep}`)
        if (!isInDist) return false
      } else if (typeof value === "object" && value !== null) {
        if (!validateExports(value, projectDir, distDir)) {
          return false
        }
      }
    }
    return true
  }

  return true
}
