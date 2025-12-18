import * as path from "node:path"
import { writeFileIfNotExists } from "./write-file-if-not-exists"
import { getDefaultTscircuitVersion } from "./get-default-tscircuit-version"

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
    main: "index.tsx",
    keywords: ["tscircuit"],
    scripts: {
      dev: "tsci dev",
      build: "tsci build",
      snapshot: "tsci snapshot",
      "snapshot:update": "tsci snapshot --update",
      start: "tsci dev",
    },
    devDependencies: {
      tscircuit: getDefaultTscircuitVersion(),
    },
  }

  writeFileIfNotExists(
    packageJsonPath,
    JSON.stringify(packageJsonContent, null, 2),
  )
}
