import fs from "node:fs"
import path from "node:path"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { findBoardFiles } from "lib/shared/find-board-files"
import { getBoardFilePatterns, loadProjectConfig } from "lib/project-config"

const isSubPath = (maybeChild: string, maybeParent: string) => {
  const relative = path.relative(maybeParent, maybeChild)
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir
  while (currentDir !== path.dirname(currentDir)) {
    // Check if package.json exists in current directory
    const packageJsonPath = path.join(currentDir, "package.json")
    if (fs.existsSync(packageJsonPath)) {
      return currentDir
    }
    currentDir = path.dirname(currentDir)
  }
  // If no package.json found, return the starting directory
  return startDir
}

export async function getBuildEntrypoints({
  fileOrDir,
  rootDir = process.cwd(),
  includeBoardFiles = true,
}: {
  fileOrDir?: string
  rootDir?: string
  includeBoardFiles?: boolean
}): Promise<{
  projectDir: string
  mainEntrypoint?: string
  previewComponentPath?: string
  circuitFiles: string[]
}> {
  const resolvedRoot = path.resolve(rootDir)
  const includeBoardFilePatterns = includeBoardFiles
    ? getBoardFilePatterns(resolvedRoot)
    : []

  const buildFromProjectDir = async () => {
    const projectConfig = loadProjectConfig(resolvedRoot)
    const resolvedPreviewComponentPath = projectConfig?.previewComponentPath
      ? path.resolve(resolvedRoot, projectConfig.previewComponentPath)
      : undefined

    if (includeBoardFiles) {
      const files = findBoardFiles({ projectDir: resolvedRoot })

      if (files.length > 0) {
        return {
          projectDir: resolvedRoot,
          previewComponentPath: resolvedPreviewComponentPath,
          circuitFiles: files,
        }
      }
    }

    const mainEntrypoint = await getEntrypoint({
      projectDir: resolvedRoot,
      onSuccess: () => undefined,
      onError: () => undefined,
    })

    if (mainEntrypoint) {
      return {
        projectDir: resolvedRoot,
        mainEntrypoint,
        previewComponentPath: resolvedPreviewComponentPath,
        circuitFiles: [mainEntrypoint],
      }
    }

    return {
      projectDir: resolvedRoot,
      previewComponentPath: resolvedPreviewComponentPath,
      circuitFiles: [],
    }
  }

  if (fileOrDir) {
    const resolved = path.resolve(resolvedRoot, fileOrDir)
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const projectConfig = loadProjectConfig(resolvedRoot)
      const resolvedPreviewComponentPath = projectConfig?.previewComponentPath
        ? path.resolve(resolvedRoot, projectConfig.previewComponentPath)
        : undefined

      if (includeBoardFiles) {
        const circuitFiles = findBoardFiles({
          projectDir: resolvedRoot,
          filePaths: [resolved],
        }).filter((file) => isSubPath(file, resolved))

        if (circuitFiles.length === 0) {
          throw new Error(
            `There were no files to build found matching the includeBoardFiles globs: ${JSON.stringify(includeBoardFilePatterns)}`,
          )
        }

        return {
          projectDir: resolvedRoot,
          previewComponentPath: resolvedPreviewComponentPath,
          circuitFiles,
        }
      }

      const projectDir = findProjectRoot(resolved)
      const mainEntrypoint = await getEntrypoint({
        projectDir,
        onSuccess: () => undefined,
        onError: () => undefined,
      })

      return {
        projectDir,
        mainEntrypoint: mainEntrypoint || undefined,
        previewComponentPath: resolvedPreviewComponentPath,
        circuitFiles: mainEntrypoint ? [mainEntrypoint] : [],
      }
    }
    // Find project root by looking for package.json
    const fileDir = path.dirname(resolved)
    const projectDir = findProjectRoot(fileDir)
    const projectConfig = loadProjectConfig(projectDir)
    const resolvedPreviewComponentPath = projectConfig?.previewComponentPath
      ? path.resolve(projectDir, projectConfig.previewComponentPath)
      : undefined
    return {
      projectDir,
      mainEntrypoint: resolved,
      previewComponentPath: resolvedPreviewComponentPath,
      circuitFiles: [resolved],
    }
  }

  return buildFromProjectDir()
}
