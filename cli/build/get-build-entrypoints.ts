import fs from "node:fs"
import path from "node:path"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { findBoardFiles } from "lib/shared/find-board-files"

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

  const buildFromProjectDir = async (projectDir: string) => {
    const files = findBoardFiles({ projectDir })

    if (files.length > 0) {
      return {
        projectDir,
        circuitFiles: files,
      }
    }

    const mainEntrypoint = await getEntrypoint({
      projectDir,
      onSuccess: () => undefined,
      onError: () => undefined,
    })

    if (mainEntrypoint) {
      return {
        projectDir,
        mainEntrypoint,
        circuitFiles: [mainEntrypoint],
      }
    }

    return {
      projectDir,
      circuitFiles: [],
    }
  }

  if (fileOrDir) {
    const resolved = path.resolve(resolvedRoot, fileOrDir)
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const projectDir = resolved
      return buildFromProjectDir(projectDir)
    }
    return { projectDir: path.dirname(resolved), circuitFiles: [resolved] }
  }

  const projectDir = resolvedRoot
  return buildFromProjectDir(projectDir)
}
