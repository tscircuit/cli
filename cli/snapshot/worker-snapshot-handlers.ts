import type { PlatformConfig } from "@tscircuit/props"
import type { CameraPreset } from "lib/shared/camera-presets"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"
import { processSnapshotFile } from "lib/shared/process-snapshot-file"
import { registerStaticAssetLoaders } from "lib/shared/register-static-asset-loaders"
import type { SnapshotCompletedMessage } from "./worker-types"

type SnapshotWorkerOptions = {
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

export const handleSnapshotFile = async (
  filePath: string,
  projectDir: string,
  snapshotsDirName: string | undefined,
  options: SnapshotWorkerOptions,
): Promise<SnapshotCompletedMessage> => {
  process.chdir(projectDir)
  await registerStaticAssetLoaders()

  const result = await processSnapshotFile({
    file: filePath,
    projectDir,
    snapshotsDirName,
    update: options.update,
    threeD: options.threeD,
    pcbOnly: options.pcbOnly,
    schematicOnly: options.schematicOnly,
    forceUpdate: options.forceUpdate,
    platformConfig: options.platformConfig,
    pcbSnapshotSettings: options.pcbSnapshotSettings,
    createDiff: options.createDiff,
    cameraPreset: options.cameraPreset,
  })

  return {
    message_type: "snapshot_completed",
    file_path: filePath,
    result,
  }
}
