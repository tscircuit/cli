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
      const files = globbySync(["**/*.board.tsx", "**/*.circuit.tsx"], {
        cwd: projectDir,
        ignore: DEFAULT_IGNORED_PATTERNS,
      })
      return {
        projectDir,
        circuitFiles: files.map((f) => path.join(projectDir, f)),
      }
    }
    return { projectDir: path.dirname(resolved), circuitFiles: [resolved] }
  }

  const projectDir = resolvedRoot
  const files = globbySync(["**/*.board.tsx", "**/*.circuit.tsx"], {
    cwd: projectDir,
    ignore: DEFAULT_IGNORED_PATTERNS,
  })
  return {
    projectDir,
    circuitFiles: files.map((f) => path.join(projectDir, f)),
  }
}
