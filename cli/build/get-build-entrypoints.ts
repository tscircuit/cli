import fs from "node:fs"
import path from "node:path"
import { globbySync } from "globby"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { DEFAULT_IGNORED_PATTERNS } from "lib/shared/should-ignore-path"

export async function getBuildEntrypoints({
  fileOrDir,
  rootDir = process.cwd(),
}: {
  fileOrDir?: string
  rootDir?: string
}): Promise<{
  projectDir: string
  mainEntrypoint?: string
  circuitFiles: string[]
}> {
  const resolvedRoot = path.resolve(rootDir)

  if (fileOrDir) {
    const resolved = path.resolve(resolvedRoot, fileOrDir)
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const projectDir = resolved
      const circuitFiles: string[] = []
      const mainEntrypoint = await getEntrypoint({
        projectDir,
        onError: () => {},
      })
      const files = globbySync("**/*.circuit.tsx", {
        cwd: projectDir,
        ignore: DEFAULT_IGNORED_PATTERNS,
      })
      for (const f of files) {
        circuitFiles.push(path.join(projectDir, f))
      }
      return {
        projectDir,
        mainEntrypoint: mainEntrypoint || undefined,
        circuitFiles,
      }
    }
    return { projectDir: path.dirname(resolved), circuitFiles: [resolved] }
  }

  const projectDir = resolvedRoot
  const circuitFiles: string[] = []
  const mainEntrypoint = await getEntrypoint({ projectDir, onError: () => {} })
  const files = globbySync("**/*.circuit.tsx", {
    cwd: projectDir,
    ignore: DEFAULT_IGNORED_PATTERNS,
  })
  for (const f of files) {
    circuitFiles.push(path.join(projectDir, f))
  }
  return {
    projectDir,
    mainEntrypoint: mainEntrypoint || undefined,
    circuitFiles,
  }
}
