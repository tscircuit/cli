import * as path from "node:path"
import { writeFileIfNotExists } from "./write-file-if-not-exists"

export const generatePackageJson = (
  dir: string,
  opts: { packageName?: string; authorName?: string } = {},
) => {
  const packageJsonPath = path.join(dir, "package.json")
  const baseName = opts.packageName || path.basename(dir)
  const name =
    opts.packageName ||
    (opts.authorName ? `@tsci/${opts.authorName}.${baseName}` : baseName)

  const packageJsonContent: Record<string, unknown> = {
    name,
    version: "1.0.0",
    description: "A tscircuit component package",
    type: "module",
    main: "index.tsx",
    license: "MIT",
    keywords: ["tscircuit", "circuit", "pcb", "electronics"],
    scripts: {
      dev: "tsci dev",
      build: "tsci build",
      snapshot: "tsci snapshot",
      "snapshot:update": "tsci snapshot --update",
      start: "tsci dev",
      typecheck: "tsc --noEmit",
    },
    devDependencies: {
      tscircuit: "latest",
      typescript: "^5.0.0",
    },
  }

  if (opts.authorName) {
    packageJsonContent.author = opts.authorName
  }

  writeFileIfNotExists(
    packageJsonPath,
    JSON.stringify(packageJsonContent, null, 2),
  )
}
