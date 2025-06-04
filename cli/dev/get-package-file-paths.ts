import * as path from "node:path"
import { globbySync } from "globby"
import { DEFAULT_IGNORED_DIRECTORIES } from "lib/shared/should-ignore-path"

export const getPackageFilePaths = (
  projectDir: string,
  ignored: string[] = [],
) => {
  const ignorePatterns = [
    ...DEFAULT_IGNORED_DIRECTORIES.map((d) => `**/${d}/**`),
    ".env",
    "**/.*",
    ...ignored.map((d) => `**/${d}/**`),
  ]
  const fileNames = globbySync("**", {
    cwd: projectDir,
    ignore: ignorePatterns,
  })

  return fileNames.map((fileName) => path.join(projectDir, fileName))
}
