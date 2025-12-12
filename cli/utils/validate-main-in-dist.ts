import fs from "node:fs"
import path from "node:path"

export const validateMainInDist = (projectDir: string, distDir: string) => {
  const packageJsonPath = path.join(projectDir, "package.json")
  if (!fs.existsSync(packageJsonPath)) return

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

  if (typeof packageJson.main !== "string") return

  const resolvedMainPath = path.resolve(projectDir, packageJson.main)
  const isMainInDist =
    resolvedMainPath === distDir ||
    resolvedMainPath.startsWith(`${distDir}${path.sep}`)

  if (!isMainInDist) {
    console.warn(
      'When using transpilation, your package\'s "main" field should point inside the `dist/*` directory, usually to "dist/index.js"',
    )
  }
}
