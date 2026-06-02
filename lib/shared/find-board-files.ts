import fs from "node:fs"
import path from "node:path"
import { globbySync } from "globby"
import {
  DEFAULT_BOARD_FILE_PATTERNS,
  getBoardFilePatterns,
  loadRuntimeProjectConfig,
} from "lib/project-config"
import { DEFAULT_IGNORED_PATTERNS } from "./should-ignore-path"

type FindBoardFilesOptions = {
  projectDir?: string
  ignore?: string[]
  filePaths?: string[]
}

const isSubPath = (maybeChild: string, maybeParent: string) => {
  const relative = path.relative(maybeParent, maybeChild)
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

/**
 * Check if a string looks like a glob pattern
 */
const isGlobPattern = (str: string): boolean => {
  return /[*?[\]{}]/.test(str)
}

/**
 * Locate all board files that match the configured include globs.
 *
 * The returned paths are absolute to make it easier for callers to work with
 * them directly without additional resolution logic.
 */
export const findBoardFiles = ({
  projectDir = process.cwd(),
  ignore = DEFAULT_IGNORED_PATTERNS,
  filePaths = [],
}: FindBoardFilesOptions = {}): string[] => {
  const resolvedProjectDir = path.resolve(projectDir)
  const boardFilePatterns = getBoardFilePatterns(resolvedProjectDir)
  return findBoardFilesFromPatterns({
    boardFilePatterns,
    projectDir: resolvedProjectDir,
    ignore,
    filePaths,
  })
}

export const findBoardFilesAsync = async ({
  projectDir = process.cwd(),
  ignore = DEFAULT_IGNORED_PATTERNS,
  filePaths = [],
}: FindBoardFilesOptions = {}): Promise<string[]> => {
  const resolvedProjectDir = path.resolve(projectDir)
  const projectConfig = await loadRuntimeProjectConfig(resolvedProjectDir)
  const boardFilePatterns =
    projectConfig?.includeBoardFiles?.filter((pattern) => pattern.trim()) ?? []
  return findBoardFilesFromPatterns({
    boardFilePatterns:
      boardFilePatterns.length > 0
        ? boardFilePatterns
        : DEFAULT_BOARD_FILE_PATTERNS,
    projectDir: resolvedProjectDir,
    ignore,
    filePaths,
  })
}

const findBoardFilesFromPatterns = ({
  boardFilePatterns,
  projectDir,
  ignore,
  filePaths,
}: {
  boardFilePatterns: string[]
  projectDir: string
  ignore: string[]
  filePaths: string[]
}): string[] => {
  const relativeBoardFiles = globbySync(boardFilePatterns, {
    cwd: projectDir,
    ignore,
  })

  const absoluteBoardFiles = relativeBoardFiles.map((f) =>
    path.join(projectDir, f),
  )

  const boardFileSet = new Set<string>()

  if (filePaths.length > 0) {
    for (const inputPath of filePaths) {
      // Check if the input path is a glob pattern
      if (isGlobPattern(inputPath)) {
        // Expand the glob pattern relative to the project directory
        const matches = globbySync(inputPath, {
          cwd: projectDir,
          ignore,
          absolute: true,
        })

        for (const match of matches) {
          boardFileSet.add(match)
        }
      } else {
        // Handle as a regular file or directory path
        const targetPath = path.resolve(projectDir, inputPath)

        if (!fs.existsSync(targetPath)) {
          continue
        }

        const stat = fs.statSync(targetPath)
        if (stat.isDirectory()) {
          const resolvedDir = path.resolve(targetPath)
          if (isSubPath(resolvedDir, projectDir)) {
            for (const boardFile of absoluteBoardFiles) {
              if (isSubPath(boardFile, resolvedDir)) {
                boardFileSet.add(boardFile)
              }
            }
          } else {
            const externalMatches = globbySync(boardFilePatterns, {
              cwd: resolvedDir,
              ignore,
            }).map((f) => path.join(resolvedDir, f))

            for (const match of externalMatches) {
              boardFileSet.add(match)
            }
          }
        } else {
          boardFileSet.add(targetPath)
        }
      }
    }
  } else {
    for (const boardFile of absoluteBoardFiles) {
      boardFileSet.add(boardFile)
    }
  }

  return Array.from(boardFileSet).sort((a, b) => a.localeCompare(b))
}
