import path from "node:path"

/**
 * Extracts the package name from a file path inside node_modules.
 * Returns null if the file is not inside node_modules.
 *
 * e.g., "/project/node_modules/react/index.js" -> "react"
 * e.g., "/project/node_modules/@tscircuit/core/dist/index.js" -> "@tscircuit/core"
 */
export function getPackageNameFromFilePath(filePath: string): string | null {
  const normalizedPath = path.normalize(filePath)
  const pathSegments = normalizedPath.split(path.sep)

  // Find the last node_modules occurrence
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    if (pathSegments[i] === "node_modules") {
      const nextSegment = pathSegments[i + 1]
      if (!nextSegment) return null

      if (nextSegment.startsWith("@") && pathSegments[i + 2]) {
        // Scoped package: @scope/package
        return `${nextSegment}/${pathSegments[i + 2]}`
      }
      return nextSegment
    }
  }

  return null
}
