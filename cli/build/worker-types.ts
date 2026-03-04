import type { PlatformConfig } from "@tscircuit/props"

/**
 * Message sent from main thread to worker to build a file
 */
export type BuildFileMessage = {
  message_type: "build_file"
  file_path: string
  output_path: string
  project_dir: string
  options?: {
    ignoreErrors?: boolean
    ignoreWarnings?: boolean
    platformConfig?: PlatformConfig
    profile?: boolean
    injectedProps?: Record<string, unknown>
  }
}

/**
 * Message sent from main thread to worker to convert circuit.json to GLB
 */
export type BuildGlbMessage = {
  message_type: "build_glb"
  circuit_json_path: string
  glb_output_path: string
  project_dir: string
}

/**
 * Message sent from worker to main thread when build completes.
 */
export type BuildCompletedMessage = {
  message_type: "build_completed"
  file_path: string
  output_path: string
  circuit_json_path: string
  ok: boolean
  /** Fatal error that should always cause exit code 1, even with --ignore-errors */
  isFatalError?: { errorType: string; message: string }
  errors: string[]
  warnings: string[]
  durationMs?: number
}

/**
 * Message sent from worker to main thread when GLB conversion completes.
 */
export type BuildGlbCompletedMessage = {
  message_type: "build_glb_completed"
  circuit_json_path: string
  glb_output_path: string
  ok: boolean
  error?: string
}

/**
 * Message sent from worker to main thread for logging
 */
export type WorkerLogMessage = {
  message_type: "worker_log"
  log_lines: string[]
}

/**
 * Union type for all messages sent to workers
 */
export type WorkerInputMessage = BuildFileMessage | BuildGlbMessage

/**
 * Union type for all messages sent from workers
 */
export type WorkerOutputMessage =
  | BuildCompletedMessage
  | BuildGlbCompletedMessage
  | WorkerLogMessage

/**
 * Result type for a build job in the worker pool.
 */
export type BuildJobResult = {
  filePath: string
  outputPath: string
  ok: boolean
  /** Fatal error that should always cause exit code 1, even with --ignore-errors */
  isFatalError?: { errorType: string; message: string }
  errors: string[]
  warnings: string[]
  durationMs?: number
}

export type BuildGlbJobResult = {
  circuitJsonPath: string
  glbOutputPath: string
  ok: boolean
  error?: string
}
