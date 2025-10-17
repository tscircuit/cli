import fs from "node:fs"
import path from "node:path"

export function listDirRecursive(
  dir: string,
  basePath: string = dir,
): string[] {
  const entries: string[] = []

  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    const relativePath = path.relative(basePath, fullPath)

    if (item.isDirectory()) {
      entries.push(relativePath + "/")
      entries.push(...listDirRecursive(fullPath, basePath))
    } else {
      entries.push(relativePath)
    }
  }

  return entries.sort()
}
