import type { Command } from "commander"
import {
  CAMERA_PRESET_NAMES,
  type CameraPreset,
} from "lib/shared/camera-presets"
import { snapshotProject } from "lib/shared/snapshot-project"

export const registerSnapshot = (program: Command) => {
  program
    .command("snapshot")
    .argument(
      "[path]",
      "Path to file, directory, or glob pattern (e.g., 'examples/**/*.tsx')",
    )
    .description(
      "Generate schematic and PCB snapshots (add --3d for 3d preview)",
    )
    .option("-u, --update", "Update snapshots on disk")
    .option("--force-update", "Force update snapshots even if they match")
    .option("--3d", "Generate 3d preview snapshots")
    .option("--pcb-only", "Generate only PCB snapshots")
    .option("--schematic-only", "Generate only schematic snapshots")
    .option("--disable-parts-engine", "Disable the parts engine")
    .option(
      "--camera-preset <preset>",
      `Camera angle preset for 3D snapshots (implies --3d). Valid presets: ${CAMERA_PRESET_NAMES.join(", ")}`,
    )
    .option("--ci", "Enable CI mode with snapshot diff artifacts")
    .option("--test", "Enable test mode with snapshot diff artifacts")
    .action(
      async (
        target: string | undefined,
        options: {
          update?: boolean
          "3d"?: boolean
          pcbOnly?: boolean
          schematicOnly?: boolean
          forceUpdate?: boolean
          disablePartsEngine?: boolean
          cameraPreset?: string
          ci?: boolean
          test?: boolean
        },
      ) => {
        if (
          options.cameraPreset &&
          !CAMERA_PRESET_NAMES.includes(options.cameraPreset as CameraPreset)
        ) {
          console.error(
            `Unknown camera preset "${options.cameraPreset}". Valid presets: ${CAMERA_PRESET_NAMES.join(", ")}`,
          )
          process.exit(1)
        }

        await snapshotProject({
          update: options.update ?? false,
          threeD: options["3d"] ?? false,
          pcbOnly: options.pcbOnly ?? false,
          schematicOnly: options.schematicOnly ?? false,
          forceUpdate: options.forceUpdate ?? false,
          filePaths: target ? [target] : [],
          platformConfig: options.disablePartsEngine
            ? { partsEngineDisabled: true }
            : undefined,
          cameraPreset: options.cameraPreset as CameraPreset | undefined,
          createDiff: (options.ci ?? false) || (options.test ?? false),
          onExit: (code) => process.exit(code),
          onError: (msg) => console.error(msg),
          onSuccess: (msg) => console.log(msg),
        })
      },
    )
}
