/**
 * Extracts the package name from an import path
 * e.g., "react/jsx-runtime" -> "react"
 * e.g., "@tscircuit/core/components" -> "@tscircuit/core"
 */
export function getPackageNameFromImport(importPath: string): string {
  if (importPath.startsWith("@")) {
    // Scoped package
    const parts = importPath.split("/")
    return `${parts[0]}/${parts[1]}`
  }
  // Regular package
  return importPath.split("/")[0]
}
