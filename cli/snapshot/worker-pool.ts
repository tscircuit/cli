import fs from "node:fs"
import path from "node:path"
import type { ProcessSnapshotFileOptions } from "lib/shared/process-snapshot-file"
import { ThreadWorkerPool } from "lib/shared/thread-worker-pool"
import type {
  SnapshotCompletedMessage,
  SnapshotFileMessage,
  SnapshotJobResult,
  WorkerOutputMessage,
} from "./worker-types"

type SnapshotJob = {
  filePath: string
  projectDir: string
  snapshotsDirName?: string
  options: Omit<
    ProcessSnapshotFileOptions,
    "file" | "projectDir" | "snapshotsDirName"
  >
}

const getWorkerEntrypointPath = (): string => {
  const tsPath = path.join(import.meta.dir, "snapshot.worker.ts")
  if (fs.existsSync(tsPath)) {
    return tsPath
  }

  const jsBundledPath = path.join(
    import.meta.dir,
    "snapshot",
    "snapshot.worker.js",
  )
  if (fs.existsSync(jsBundledPath)) {
    return jsBundledPath
  }

  return path.join(import.meta.dir, "snapshot.worker.js")
}

export const snapshotFilesWithWorkerPool = async (options: {
  files: string[]
  projectDir: string
  snapshotsDirName?: string
  concurrency: number
  snapshotOptions: Omit<
    ProcessSnapshotFileOptions,
    "file" | "projectDir" | "snapshotsDirName"
  >
  onLog?: (lines: string[]) => void
  onJobComplete?: (result: SnapshotJobResult) => void | Promise<void>
  stopOnFailure?: boolean
}): Promise<SnapshotJobResult[]> => {
  const cancellationError = new Error("Snapshot cancelled due to file failure")
  const poolConcurrency = Math.max(
    1,
    Math.min(options.concurrency, options.files.length),
  )

  const pool = new ThreadWorkerPool<
    SnapshotJob,
    SnapshotFileMessage,
    WorkerOutputMessage,
    SnapshotJobResult
  >({
    concurrency: poolConcurrency,
    workerEntrypointPath: getWorkerEntrypointPath(),
    createMessage: (job) => ({
      message_type: "snapshot_file",
      file_path: job.filePath,
      project_dir: job.projectDir,
      snapshots_dir_name: job.snapshotsDirName,
      options: {
        update: job.options.update,
        threeD: job.options.threeD,
        pcbOnly: job.options.pcbOnly,
        schematicOnly: job.options.schematicOnly,
        forceUpdate: job.options.forceUpdate,
        platformConfig: job.options.platformConfig,
        createDiff: job.options.createDiff,
        cameraPreset: job.options.cameraPreset,
      },
    }),
    isLogMessage: (message) => message.message_type === "worker_log",
    getLogLines: (message) =>
      message.message_type === "worker_log" ? message.log_lines : [],
    isCompletionMessage: (message) =>
      message.message_type === "snapshot_completed",
    getResult: (message) => {
      const completedMessage = message as SnapshotCompletedMessage
      return {
        filePath: completedMessage.file_path,
        result: completedMessage.result,
      }
    },
    shouldStopOnMessage: (message) => {
      if (
        !options.stopOnFailure ||
        message.message_type !== "snapshot_completed"
      ) {
        return false
      }
      return !(message as SnapshotCompletedMessage).result.ok
    },
    cancellationError,
    onLog: options.onLog,
  })

  const results: SnapshotJobResult[] = []
  const jobs = options.files.map((filePath) =>
    pool
      .queueJob({
        filePath,
        projectDir: options.projectDir,
        snapshotsDirName: options.snapshotsDirName,
        options: options.snapshotOptions,
      })
      .then(async (result) => {
        results.push(result)
        await options.onJobComplete?.(result)
        return result
      }),
  )

  const settledResults = await Promise.allSettled(jobs)

  for (const settledResult of settledResults) {
    if (
      settledResult.status === "rejected" &&
      settledResult.reason !== cancellationError
    ) {
      throw settledResult.reason
    }
  }

  if (typeof Bun === "undefined") {
    await pool.terminate()
  }

  return results
}
