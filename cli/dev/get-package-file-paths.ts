import * as path from "node:path"
import { globbySync } from "globby"

export const getPackageFilePaths = (projectDir: string) => {
  const fileNames = globbySync("**", {
    cwd: projectDir,
    ignore: ["**/node_modules/**", "**/.git/**"],
  })

  return fileNames.map((fileName) => path.join(projectDir, fileName))
}
