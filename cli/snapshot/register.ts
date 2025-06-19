import type { Command } from "commander"
import { snapshotProject } from "lib/shared/snapshot-project"

export const registerSnapshot = (program: Command) => {
  program
    .command("snapshot")
    .description(
      "Generate schematic and PCB snapshots (add --3d for 3d preview)",
    )
    .option("-u, --update", "Update snapshots on disk")
    .option("--3d", "Generate 3d preview snapshots")
    .option("--pcb-only", "Generate only PCB snapshots")
    .option("--schematic-only", "Generate only schematic snapshots")
    .action(
      async (options: {
        update?: boolean
        "3d"?: boolean
        pcbOnly?: boolean
        schematicOnly?: boolean
      }) => {
        await snapshotProject({
          update: options.update ?? false,
          threeD: options["3d"] ?? false,
          pcbOnly: options.pcbOnly ?? false,
          schematicOnly: options.schematicOnly ?? false,
          onExit: (code) => process.exit(code),
          onError: (msg) => console.error(msg),
          onSuccess: (msg) => console.log(msg),
        })
      },
    )
}
