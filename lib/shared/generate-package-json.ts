import * as path from "node:path"
import { writeFileIfNotExists } from "./write-file-if-not-exists"

export const generatePackageJson = (
  dir: string,
  opts: { packageName?: string; authorName?: string } = {},
) => {
  const packageJsonPath = path.join(dir, "package.json")
  const baseName = opts.packageName || path.basename(dir)
  const name = opts.authorName
    ? `@tsci/${opts.authorName}.${baseName}`
    : baseName
  const packageJsonContent = {
    name,
    version: "1.0.0",
    description: "A TSCircuit project",
    main: "index.tsx",
    keywords: ["tscircuit", "electronics"],
    scripts: {
      dev: "tsci dev",
      build: "tsci build",
      start: "tsci dev",
    },
  }

  writeFileIfNotExists(
    packageJsonPath,
    JSON.stringify(packageJsonContent, null, 2),
  )
}
