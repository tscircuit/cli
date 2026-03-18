import type { PlatformConfig } from "@tscircuit/props"
import type { CameraPreset } from "lib/shared/camera-presets"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"
import type { ProcessSnapshotFileResult } from "lib/shared/process-snapshot-file"

export type SnapshotFileMessage = {
  message_type: "snapshot_file"
  file_path: string
  project_dir: string
  snapshots_dir_name?: string
  options: {
    update: boolean
    threeD: boolean
    pcbOnly: boolean
    schematicOnly: boolean
    forceUpdate: boolean
    platformConfig?: PlatformConfig
    pcbSnapshotSettings?: PcbSnapshotSettings
    createDiff: boolean
    cameraPreset?: CameraPreset
  }
}

export type SnapshotCompletedMessage = {
  message_type: "snapshot_completed"
  file_path: string
  result: ProcessSnapshotFileResult
}

export type WorkerLogMessage = {
  message_type: "worker_log"
  log_lines: string[]
}

export type WorkerInputMessage = SnapshotFileMessage

export type WorkerOutputMessage = SnapshotCompletedMessage | WorkerLogMessage

export type SnapshotJobResult = {
  filePath: string
  result: ProcessSnapshotFileResult
}
