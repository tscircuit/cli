import fs from "node:fs"
import path from "node:path"
import { cliConfig } from "lib/cli-config"

export const BUILD_HISTORY_DIR_NAME = ".tscircuit-build-history"

export interface CircuitJsonBuildHistoryEntry {
  /** When this circuit JSON was written by a build. */
  createdAt: Date
  circuitJsonPath: string
}

/** ISO 8601 UTC with ":" replaced, because Windows forbids it in file names. */
export const formatBuildHistoryTimestamp = (date: Date) =>
  date.toISOString().replaceAll(":", "-")

export const parseBuildHistoryTimestamp = (directoryName: string) => {
  const match = directoryName.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.(\d{3})Z$/,
  )
  if (!match) return null
  const [, day, hours, minutes, seconds, milliseconds] = match
  const date = new Date(
    `${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`,
  )
  return Number.isNaN(date.getTime()) ? null : date
}

const getProjectRelativePath = (projectDir: string, filePath: string) => {
  const relativePath = path.relative(projectDir, filePath)
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null
  }
  return relativePath
}

/**
 * Keeps the circuit JSON a rebuild is about to replace, at
 * `.tscircuit-build-history/<time it was built>/<project-relative path>`.
 * History is best-effort and must never fail the build. Turn it off with
 * `tsci config set saveBuildHistory false`.
 */
export const archiveCircuitJsonBuild = ({
  projectDir,
  outputPath,
  warn = console.warn,
}: {
  projectDir: string
  outputPath: string
  warn?: (message: string) => void
}) => {
  try {
    if (cliConfig.get("saveBuildHistory") === false) return
    const relativePath = getProjectRelativePath(projectDir, outputPath)
    if (!relativePath || !fs.existsSync(outputPath)) return
    const stat = fs.statSync(outputPath)
    if (!stat.isFile()) return

    const archivedPath = path.join(
      projectDir,
      BUILD_HISTORY_DIR_NAME,
      formatBuildHistoryTimestamp(stat.mtime),
      relativePath,
    )
    if (!fs.existsSync(archivedPath)) {
      fs.mkdirSync(path.dirname(archivedPath), { recursive: true })
      fs.copyFileSync(outputPath, archivedPath)
    }
    return archivedPath
  } catch (error) {
    warn(
      `Could not save build history for ${path.relative(projectDir, outputPath)}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/** Every archived build of one circuit JSON output plus the current one, oldest first. */
export const getCircuitJsonBuildHistory = ({
  projectDir,
  outputPath,
}: {
  projectDir: string
  outputPath: string
}): CircuitJsonBuildHistoryEntry[] => {
  const relativePath = getProjectRelativePath(projectDir, outputPath)
  if (!relativePath) return []

  const entriesByTimestamp = new Map<string, CircuitJsonBuildHistoryEntry>()
  const historyDir = path.join(projectDir, BUILD_HISTORY_DIR_NAME)
  if (fs.existsSync(historyDir)) {
    for (const directoryName of fs.readdirSync(historyDir)) {
      const createdAt = parseBuildHistoryTimestamp(directoryName)
      const circuitJsonPath = path.join(historyDir, directoryName, relativePath)
      if (!createdAt || !fs.existsSync(circuitJsonPath)) continue
      entriesByTimestamp.set(directoryName, { createdAt, circuitJsonPath })
    }
  }

  if (fs.existsSync(outputPath)) {
    const createdAt = fs.statSync(outputPath).mtime
    entriesByTimestamp.set(formatBuildHistoryTimestamp(createdAt), {
      createdAt,
      circuitJsonPath: outputPath,
    })
  }

  return [...entriesByTimestamp.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )
}
