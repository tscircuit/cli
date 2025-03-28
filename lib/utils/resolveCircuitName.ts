import fs from "node:fs"
import path from "node:path"

export const resolveCircuitName = (
  componentFilePath: string,
  defaultName: string = "tsci dev",
): string => {
  const componentDir = path.dirname(componentFilePath)
  const packageJsonPath = path.resolve(componentDir, "package.json")

  try {
    const fileContent = fs.readFileSync(componentFilePath, "utf-8")
    const match = fileContent.match(/export\s+default\s+(\w+)/)
    if (match && match[1]) {
      return match[1]
    }
  } catch (error) {
    console.error("Failed to read component file:", error)
  }

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
