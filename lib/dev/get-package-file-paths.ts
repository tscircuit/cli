import * as path from "node:path"
import { globbySync } from "globby"
import {
  DEFAULT_IGNORED_PATTERNS,
  normalizeIgnorePattern,
} from "lib/shared/should-ignore-path"

export const getPackageFilePaths = (
  projectDir: string,
  ignored: string[] = [],
) => {
  const ignorePatterns = [
    ...DEFAULT_IGNORED_PATTERNS,
    ...ignored.map(normalizeIgnorePattern),
  ]
  const fileNames = globbySync("**", {
    cwd: projectDir,
    ignore: ignorePatterns,
  })
  fileNames.sort()

  return fileNames.map((fileName) => path.join(projectDir, fileName))
}
