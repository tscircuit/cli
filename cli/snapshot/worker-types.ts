import type { PlatformConfig } from "@tscircuit/props"

export type SnapshotFileMessage = {
  message_type: "snapshot_file"
  project_dir: string
  file_path: string
  options?: {
    update?: boolean
    threeD?: boolean
    pcbOnly?: boolean
    schematicOnly?: boolean
    forceUpdate?: boolean
    snapshotsDirName?: string
    platformConfig?: PlatformConfig
  }
}

export type SnapshotCompletedMessage = {
  message_type: "snapshot_completed"
  file_path: string
  ok: boolean
  didUpdate: boolean
  mismatches: string[]
  errors: string[]
  warnings?: string[]
}

export type SnapshotLogMessage = {
  message_type: "snapshot_log"
  log_lines: string[]
}

export type SnapshotWorkerInputMessage = SnapshotFileMessage

export type SnapshotWorkerOutputMessage =
  | SnapshotCompletedMessage
  | SnapshotLogMessage

export type SnapshotJobResult = {
  filePath: string
  ok: boolean
  didUpdate: boolean
  mismatches: string[]
  errors: string[]
  warnings?: string[]
}
