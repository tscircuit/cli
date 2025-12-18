import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

type PackageJson = {
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const packageJsonPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "package.json",
)

const packageJson = JSON.parse(
  fs.readFileSync(packageJsonPath, "utf-8"),
) as PackageJson

export const getDefaultTscircuitVersion = () =>
  packageJson.devDependencies?.tscircuit ??
  packageJson.peerDependencies?.tscircuit ??
  "latest"
