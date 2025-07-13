import type { Command } from "commander"
import { snapshotProject } from "lib/shared/snapshot-project"

export const registerSnapshot = (program: Command) => {
  program
    .command("snapshot")
    .argument("[file]", "Path to the board or circuit file")
    .description(
      "Generate schematic and PCB snapshots (add --3d for 3d preview)",
    )
    .option("-u, --update", "Update snapshots on disk")
    .option("--force-update", "Force update even when snapshots match")
    .option("--3d", "Generate 3d preview snapshots")
    .option("--pcb-only", "Generate only PCB snapshots")
    .option("--schematic-only", "Generate only schematic snapshots")
    .action(
      async (
        file: string | undefined,
        options: {
          update?: boolean
          "3d"?: boolean
          pcbOnly?: boolean
          schematicOnly?: boolean
          forceUpdate?: boolean
        },
      ) => {
        await snapshotProject({
          update: options.update ?? false,
          forceUpdate: options.forceUpdate ?? false,
          threeD: options["3d"] ?? false,
          pcbOnly: options.pcbOnly ?? false,
          schematicOnly: options.schematicOnly ?? false,
          filePaths: file ? [file] : [],
          onExit: (code) => process.exit(code),
          onError: (msg) => console.error(msg),
          onSuccess: (msg) => console.log(msg),
        })
      },
    )
}
