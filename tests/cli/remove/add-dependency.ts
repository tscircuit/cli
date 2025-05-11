import { join } from "node:path"

export async function addDependency(tmpDir: string, dep: string) {
  const pkgJsonPath = join(tmpDir, "package.json")
  const pkgJson = JSON.parse(await Bun.file(pkgJsonPath).text())
  pkgJson.dependencies = pkgJson.dependencies || {}
  pkgJson.dependencies[dep] = "^1.0.0"
  await Bun.write(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
} 