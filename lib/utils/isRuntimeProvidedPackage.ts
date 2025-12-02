/**
 * Packages that are provided by the runtime and should not be uploaded.
 * These are available in the browser environment.
 */
export const RUNTIME_PROVIDED_PACKAGES = new Set([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "tscircuit",
  "@tscircuit/core",
  "@tscircuit/props",
])

/**
 * Check if a package is provided by the runtime and should not be uploaded
 */
export function isRuntimeProvidedPackage(packageName: string): boolean {
  if (RUNTIME_PROVIDED_PACKAGES.has(packageName)) {
    return true
  }

  // Check if it's a subpath of a runtime package (e.g., "react/jsx-runtime")
  for (const runtimePkg of Array.from(RUNTIME_PROVIDED_PACKAGES)) {
    if (packageName.startsWith(`${runtimePkg}/`)) {
      return true
    }
  }

  return false
}
