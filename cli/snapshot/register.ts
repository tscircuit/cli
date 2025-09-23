import type { Command } from "commander"
import { snapshotProject } from "lib/shared/snapshot-project"

export const registerSnapshot = (program: Command) => {
  program
    .command("snapshot")
    .argument(
      "[path]",
      "Path to the board, circuit file, or directory containing them",
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
        },
      ) => {
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
          onExit: (code) => process.exit(code),
          onError: (msg) => console.error(msg),
          onSuccess: (msg) => console.log(msg),
        })
      },
    )
}
