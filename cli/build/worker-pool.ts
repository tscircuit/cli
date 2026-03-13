import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import { ThreadWorkerPool } from "lib/shared/thread-worker-pool"
import type { DrcIgnoreOptions } from "./drc-diagnostic-filter"
import type { BuildImageFormatSelection } from "./image-format-selection"
import type {
  BuildCompletedMessage,
  BuildFileMessage,
  BuildJobResult,
  WorkerOutputMessage,
} from "./worker-types"

type BuildJob = {
  filePath: string
  outputPath: string
  glbOutputPath?: string
  previewOutputDir?: string
  projectDir: string
  options?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
  } & DrcIgnoreOptions & {
      platformConfig?: PlatformConfig
      profile?: boolean
      injectedProps?: Record<string, unknown>
      generatePreviewAssets?: boolean
      imageFormats?: BuildImageFormatSelection
    }
}

const getWorkerEntrypointPath = (): string => {
  // Check for .ts file first (development), then .js (published/dist)
  const tsPath = path.join(import.meta.dir, "build.worker.ts")
  if (fs.existsSync(tsPath)) {
    return tsPath
  }
  // When bundled, main.js is in dist/ and worker is in dist/build/
  const jsBundledPath = path.join(import.meta.dir, "build", "build.worker.js")
  if (fs.existsSync(jsBundledPath)) {
    return jsBundledPath
  }
  // Fallback: same directory
  return path.join(import.meta.dir, "build.worker.js")
}

/**
 * Build multiple files in parallel using worker threads.
 * Workers are spawned once and reused for multiple files.
 * Circuit JSON is written to disk, not passed through IPC.
 */
export async function buildFilesWithWorkerPool(options: {
  files: Array<{
    filePath: string
    outputPath: string
    glbOutputPath?: string
    previewOutputDir?: string
    generatePreviewAssets?: boolean
  }>
  projectDir: string
  concurrency: number
  buildOptions?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
  } & DrcIgnoreOptions & {
      platformConfig?: PlatformConfig
      profile?: boolean
      injectedProps?: Record<string, unknown>
      generatePreviewAssets?: boolean
      imageFormats?: BuildImageFormatSelection
    }
  onLog?: (lines: string[]) => void
  onJobComplete?: (result: BuildJobResult) => void
  stopOnFatal?: boolean
}): Promise<BuildJobResult[]> {
  const cancellationError = new Error("Build cancelled due fatal error")
  const workerJobTimeoutMs = Number.parseInt(
    process.env.TSCIRCUIT_BUILD_WORKER_TIMEOUT_MS || "180000",
    10,
  )
  const poolConcurrency = Math.max(
    1,
    Math.min(options.concurrency, options.files.length),
  )

  const pool = new ThreadWorkerPool<
    BuildJob,
    BuildFileMessage,
    WorkerOutputMessage,
    BuildJobResult
  >({
    concurrency: poolConcurrency,
    workerEntrypointPath: getWorkerEntrypointPath(),
    createMessage: (job) => ({
      message_type: "build_file",
      file_path: job.filePath,
      output_path: job.outputPath,
      glb_output_path: job.glbOutputPath,
      preview_output_dir: job.previewOutputDir,
      project_dir: job.projectDir,
      options: job.options,
    }),
    isLogMessage: (message) => message.message_type === "worker_log",
    getLogLines: (message) =>
      message.message_type === "worker_log" ? message.log_lines : [],
    isCompletionMessage: (message) =>
      message.message_type === "build_completed",
    getResult: (message) => {
      const completedMessage = message as BuildCompletedMessage
      return {
        filePath: completedMessage.file_path,
        outputPath: completedMessage.output_path,
        glbOutputPath: completedMessage.glb_output_path,
        previewOutputDir: completedMessage.preview_output_dir,
        glbOk: completedMessage.glb_ok,
        glbError: completedMessage.glb_error,
        previewOk: completedMessage.preview_ok,
        previewError: completedMessage.preview_error,
        ok: completedMessage.ok,
        hasErrors: completedMessage.hasErrors,
        ignoredDrcCount: completedMessage.ignoredDrcCount,
        ignoredDrcByCategory: completedMessage.ignoredDrcByCategory,
        isFatalError: completedMessage.isFatalError,
        errors: completedMessage.errors,
        warnings: completedMessage.warnings,
        durationMs: completedMessage.durationMs,
      }
    },
    shouldStopOnMessage: (message) => {
      if (!options.stopOnFatal || message.message_type !== "build_completed") {
        return false
      }
      return Boolean((message as BuildCompletedMessage).isFatalError)
    },
    cancellationError,
    jobTimeoutMs:
      Number.isFinite(workerJobTimeoutMs) && workerJobTimeoutMs > 0
        ? workerJobTimeoutMs
        : undefined,
    onLog: options.onLog,
  })

  const results: BuildJobResult[] = []
  const promises: Promise<BuildJobResult>[] = []

  for (const file of options.files) {
    const promise = pool
      .queueJob({
        filePath: file.filePath,
        outputPath: file.outputPath,
        glbOutputPath: file.glbOutputPath,
        previewOutputDir: file.previewOutputDir,
        projectDir: options.projectDir,
        options: {
          ...options.buildOptions,
          generatePreviewAssets:
            file.generatePreviewAssets ??
            options.buildOptions?.generatePreviewAssets,
        },
      })
      .then(async (result) => {
        results.push(result)
        if (options.onJobComplete) {
          await options.onJobComplete(result)
        }

        return result
      })

    promises.push(promise)
  }

  const settledResults = await Promise.allSettled(promises)

  for (const settledResult of settledResults) {
    if (
      settledResult.status === "rejected" &&
      settledResult.reason !== cancellationError
    ) {
      throw settledResult.reason
    }
  }

  // NOTE: In some Bun runtimes, terminating worker threads here can cause the
  // parent process to exit before post-build steps (site/preview/transpile)
  // run. The CLI exits explicitly at the end of the build command, so on Bun
  // we let process shutdown clean up workers.
  if (typeof Bun === "undefined") {
    await pool.terminate()
  }

  return results
}
