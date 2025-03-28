import fs from "node:fs"
import path from "node:path"

/**
 * Resolves the circuit name dynamically.
 * - First, attempts to extract the exported component name from the file.
 * - If no exported component name is found, falls back to the package.json name.
 * @param componentFilePath - The path to the component file.
 * @param defaultName - The default circuit name to use if none is found.
 * @returns The resolved circuit name.
 */
export const resolveCircuitName = (
  componentFilePath: string,
  defaultName: string = "tsci dev",
): string => {
  const componentDir = path.dirname(componentFilePath)
  const packageJsonPath = path.resolve(componentDir, "package.json")

  // Attempt to extract the exported component name
  try {
    const fileContent = fs.readFileSync(componentFilePath, "utf-8")
    const match = fileContent.match(/export\s+default\s+(\w+)/)
    if (match && match[1]) {
      return match[1] // Return the exported component name
    }
  } catch (error) {
    console.error("Failed to read component file:", error)
  }

  // Fallback to package.json name
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
      return packageJson.name || defaultName
    } catch (error) {
      console.error("Failed to read package.json:", error)
    }
  } else {
    console.warn(
      `No package.json found in ${componentDir}, using default circuit name.`,
    )
  }

  return defaultName
}
