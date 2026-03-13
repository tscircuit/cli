import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import { snapshotFilesWithWorkerPool } from "cli/snapshot/worker-pool"
import kleur from "kleur"
import {
  getBoardFilePatterns,
  getSnapshotsDir,
  loadProjectConfig,
} from "lib/project-config"
import type { CameraPreset } from "lib/shared/camera-presets"
import { findBoardFiles } from "lib/shared/find-board-files"
import { processSnapshotFile } from "lib/shared/process-snapshot-file"
import {
  DEFAULT_IGNORED_PATTERNS,
  normalizeIgnorePattern,
} from "lib/shared/should-ignore-path"

type SnapshotOptions = {
  update?: boolean
  ignored?: string[]
  /** Enable generation of 3d preview snapshots */
  threeD?: boolean
  /** Only generate PCB snapshots */
  pcbOnly?: boolean
  /** Only generate schematic snapshots */
  schematicOnly?: boolean
  /** Snapshot only the specified files */
  filePaths?: string[]
  /** Force updating snapshots even if they match */
  forceUpdate?: boolean
  /** Optional platform configuration overrides */
  platformConfig?: PlatformConfig
  /** Create visual diff artifacts when snapshots mismatch */
  createDiff?: boolean
  /** Camera preset name for 3D snapshots (implies --3d) */
  cameraPreset?: CameraPreset
  /** Number of files to process in parallel (default: 1) */
  concurrency?: number
  onExit?: (code: number) => void
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

const getIncludeBoardFilesSource = (projectDir: string): boolean => {
  const projectConfig = loadProjectConfig(projectDir)
  const hasConfiguredIncludeBoardFiles = Boolean(
    projectConfig?.includeBoardFiles?.some((pattern) => pattern.trim()),
  )

  return hasConfiguredIncludeBoardFiles
}

export const snapshotProject = async ({
  update = false,
  ignored = [],
  threeD = false,
  pcbOnly = false,
  schematicOnly = false,
  filePaths = [],
  forceUpdate = false,
  onExit = (code) => process.exit(code),
  onError = (msg) => console.error(msg),
  onSuccess = (msg) => console.log(msg),
  platformConfig,
  createDiff = false,
  cameraPreset,
  concurrency = 1,
}: SnapshotOptions = {}) => {
  // --camera-preset implies --3d
  if (cameraPreset) {
    threeD = true
  }
  const projectDir = process.cwd()
  const ignore = [
    ...DEFAULT_IGNORED_PATTERNS,
    ...ignored.map(normalizeIgnorePattern),
  ]

  const resolvedPaths = filePaths.map((f) => path.resolve(projectDir, f))
  const explicitDirectoryTarget = resolvedPaths.find((resolvedPath) => {
    if (!fs.existsSync(resolvedPath)) {
      return false
    }

    return fs.statSync(resolvedPath).isDirectory()
  })
  const boardFiles = findBoardFiles({
    projectDir,
    ignore,
    filePaths: resolvedPaths,
  })

  if (boardFiles.length === 0) {
    if (explicitDirectoryTarget) {
      const relativeDirectory =
        path.relative(projectDir, explicitDirectoryTarget) || "."
      const includeBoardFilePatterns = getBoardFilePatterns(projectDir)
      const includeBoardFilesSource = getIncludeBoardFilesSource(projectDir)
      const patternSourceMessage = includeBoardFilesSource
        ? "Searched using tscircuit.config.json includeBoardFiles"
        : "Searched using default includeBoardFiles"

      onError(
        [
          `No circuit files found to create snapshots in directory: "${relativeDirectory}"`,
          `${patternSourceMessage}: ${JSON.stringify(includeBoardFilePatterns)}`,
        ].join("\n"),
      )
      return onExit(1)
    }

    console.log(
      "No entrypoint found. Run 'tsci init' to bootstrap a project or specify a file with 'tsci snapshot <file>'",
    )
    return onExit(0)
  }

  const snapshotsDirName = getSnapshotsDir(projectDir)
  const mismatches: string[] = []
  let didUpdate = false

  const concurrencyValue = Math.max(1, concurrency)
  const processResult = (
    result: Awaited<ReturnType<typeof processSnapshotFile>>,
  ) => {
    for (const warningMessage of result.warningMessages) {
      console.log(warningMessage)
    }

    for (const successPath of result.successPaths) {
      console.log("✅", kleur.gray(successPath))
    }

    didUpdate = didUpdate || result.didUpdate
    mismatches.push(...result.mismatches)
  }

  if (concurrencyValue > 1 && boardFiles.length > 1) {
    console.log(
      `Generating snapshots for ${boardFiles.length} file(s) with concurrency ${concurrencyValue}...`,
    )

    let firstErrorMessage: string | undefined

    try {
      await snapshotFilesWithWorkerPool({
        files: boardFiles,
        projectDir,
        snapshotsDirName,
        concurrency: concurrencyValue,
        snapshotOptions: {
          update,
          threeD,
          pcbOnly,
          schematicOnly,
          forceUpdate,
          platformConfig,
          createDiff,
          cameraPreset,
        },
        stopOnFailure: true,
        onLog: (lines) => {
          for (const line of lines) {
            console.log(line)
          }
        },
        onJobComplete: (jobResult) => {
          const { result } = jobResult
          processResult(result)
          if (!result.ok && !firstErrorMessage) {
            firstErrorMessage =
              result.errorMessage ?? "Snapshot generation failed"
          }
        },
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      onError(kleur.red(errorMessage))
      return onExit(1)
    }

    if (firstErrorMessage) {
      onError(firstErrorMessage)
      return onExit(1)
    }
  } else {
    for (const file of boardFiles) {
      const result = await processSnapshotFile({
        file,
        projectDir,
        snapshotsDirName,
        update,
        threeD,
        pcbOnly,
        schematicOnly,
        forceUpdate,
        platformConfig,
        createDiff,
        cameraPreset,
      })

      processResult(result)

      if (!result.ok) {
        onError(result.errorMessage ?? "Snapshot generation failed")
        return onExit(1)
      }
    }
  }

  if (update) {
    didUpdate
      ? onSuccess("Created snapshots")
      : onSuccess("All snapshots already up to date")
    return onExit(0)
  }

  if (mismatches.length) {
    onError(
      `Snapshot mismatch:\n${mismatches.join("\n")}\n\nRun with --update to fix.`,
    )
    return onExit(1)
  }

  onSuccess("All snapshots match")
  return onExit(0)
}
