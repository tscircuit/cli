import type { PlatformConfig } from "@tscircuit/props"
import type { VisibleLayerRef } from "circuit-json"
import type { CameraPreset } from "lib/shared/camera-presets"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"
import { processSnapshotFile } from "lib/shared/process-snapshot-file"
import { registerStaticAssetLoaders } from "lib/shared/register-static-asset-loaders"
import { loadRuntimeProjectConfig } from "lib/project-config"
import { mergePlatformConfigs } from "lib/shared/platform-config-utils"
import type { SnapshotCompletedMessage } from "./worker-types"

type SnapshotWorkerOptions = {
  update: boolean
  threeD: boolean
  pcbOnly: boolean
  schematicOnly: boolean
  simulationOnly: boolean
  forceUpdate: boolean
  platformConfig?: PlatformConfig
  pcbSnapshotSettings?: PcbSnapshotSettings
  createDiff: boolean
  cameraPreset?: CameraPreset
  pcbLayer?: VisibleLayerRef
}

export const handleSnapshotFile = async (
  filePath: string,
  projectDir: string,
  snapshotsDirName: string | undefined,
  options: SnapshotWorkerOptions,
): Promise<SnapshotCompletedMessage> => {
  process.chdir(projectDir)
  await registerStaticAssetLoaders()
  const projectConfig = await loadRuntimeProjectConfig(projectDir)
  const platformConfig = mergePlatformConfigs(
    projectConfig?.platformConfig,
    options.platformConfig,
  )

  const result = await processSnapshotFile({
    file: filePath,
    projectDir,
    snapshotsDirName,
    update: options.update,
    threeD: options.threeD,
    pcbOnly: options.pcbOnly,
    schematicOnly: options.schematicOnly,
    simulationOnly: options.simulationOnly,
    forceUpdate: options.forceUpdate,
    platformConfig,
    pcbSnapshotSettings: options.pcbSnapshotSettings,
    createDiff: options.createDiff,
    cameraPreset: options.cameraPreset,
    pcbLayer: options.pcbLayer,
  })

  return {
    message_type: "snapshot_completed",
    file_path: filePath,
    result,
  }
}
