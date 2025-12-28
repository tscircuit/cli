import * as fs from "node:fs"
import * as path from "node:path"
import { globbySync } from "globby"
import { findBoardFiles } from "lib/shared/find-board-files"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { DEFAULT_IGNORED_PATTERNS } from "lib/shared/should-ignore-path"

export interface DevTargetResult {
  absolutePath: string
  projectDir: string
}

const findSelectableFiles = (projectDir: string): string[] => {
  const boardFiles = findBoardFiles({ projectDir })
    .filter((file) => fs.existsSync(file))
    .sort()

  if (boardFiles.length > 0) {
    return boardFiles
  }

  const files = globbySync(["**/*.tsx", "**/*.ts", "**/*.circuit.json"], {
    cwd: projectDir,
    ignore: DEFAULT_IGNORED_PATTERNS,
  })

  return files
    .map((file) => path.resolve(projectDir, file))
    .filter((file) => fs.existsSync(file))
    .sort()
}

const isValidDevFile = (filePath: string): boolean => {
  return (
    filePath.endsWith(".tsx") ||
    filePath.endsWith(".ts") ||
    filePath.endsWith(".circuit.json")
  )
}

export const resolveDevTarget = async (
  file: string | undefined,
): Promise<DevTargetResult | null> => {
  let projectDir = process.cwd()

  if (file) {
    const resolvedPath = path.resolve(file)

    // Check if the argument is a directory
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      projectDir = resolvedPath
      const availableFiles = findSelectableFiles(projectDir)

      if (availableFiles.length === 0) {
        console.log(
          `No .tsx, .ts, or .circuit.json files found in ${projectDir}. Run 'tsci init' to bootstrap a basic project.`,
        )
        return null
      }

      console.log("Selected file:", path.relative(projectDir, availableFiles[0]))
      return { absolutePath: availableFiles[0], projectDir }
    }

    // It's a file path
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${file}`)
      return null
    }

    if (!isValidDevFile(resolvedPath)) {
      console.error("Error: Only .tsx, .ts, and .circuit.json files are supported")
      return null
    }

    return { absolutePath: resolvedPath, projectDir }
  }

  // No file argument - try to find entrypoint
  const entrypointPath = await getEntrypoint({ onError: () => {} })
  if (entrypointPath && fs.existsSync(entrypointPath)) {
    console.log("Found entrypoint at:", entrypointPath)
    return { absolutePath: entrypointPath, projectDir }
  }

  // Find all selectable files in the project
  const availableFiles = findSelectableFiles(projectDir)
  if (availableFiles.length === 0) {
    console.log(
      "No .tsx, .ts, or .circuit.json files found in the project. Run 'tsci init' to bootstrap a basic project.",
    )
    return null
  }

  console.log("Selected file:", path.relative(projectDir, availableFiles[0]))
  return { absolutePath: availableFiles[0], projectDir }
}
