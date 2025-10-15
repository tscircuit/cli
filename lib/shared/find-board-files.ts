import fs from "node:fs"
import path from "node:path"
import { globbySync } from "globby"
import { getBoardFilePatterns } from "lib/project-config"
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

  const relativeBoardFiles = globbySync(boardFilePatterns, {
    cwd: resolvedProjectDir,
    ignore,
  })

  const absoluteBoardFiles = relativeBoardFiles.map((f) =>
    path.join(resolvedProjectDir, f),
  )

  const boardFileSet = new Set<string>()

  const resolvedPaths = filePaths.map((f) =>
    path.resolve(resolvedProjectDir, f),
  )

  if (resolvedPaths.length > 0) {
    for (const targetPath of resolvedPaths) {
      if (!fs.existsSync(targetPath)) {
        continue
      }

      const stat = fs.statSync(targetPath)
      if (stat.isDirectory()) {
        const resolvedDir = path.resolve(targetPath)
        if (isSubPath(resolvedDir, resolvedProjectDir)) {
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
  } else {
    for (const boardFile of absoluteBoardFiles) {
      boardFileSet.add(boardFile)
    }
  }

  return Array.from(boardFileSet).sort((a, b) => a.localeCompare(b))
}
