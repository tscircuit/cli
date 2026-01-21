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
  }
}

/**
 * Message sent from worker to main thread when build completes
 */
export type BuildCompletedMessage = {
  message_type: "build_completed"
  file_path: string
  output_path: string
  circuit_json_path: string
  circuit_json: unknown[] | null
  ok: boolean
  errors: string[]
  warnings: string[]
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
export type WorkerInputMessage = BuildFileMessage

/**
 * Union type for all messages sent from workers
 */
export type WorkerOutputMessage = BuildCompletedMessage | WorkerLogMessage

/**
 * Result type for a build job in the worker pool
 */
export type BuildJobResult = {
  filePath: string
  outputPath: string
  ok: boolean
  circuitJson: unknown[] | null
  errors: string[]
  warnings: string[]
}
