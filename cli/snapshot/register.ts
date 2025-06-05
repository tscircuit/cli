import type { Command } from "commander"
import { snapshotProject } from "lib/shared/snapshot-project"

export const registerSnapshot = (program: Command) => {
  program
    .command("snapshot")
    .description("Generate schematic and PCB snapshots")
    .option("-u, --update", "Update snapshots on disk")
    .action(async (options: { update?: boolean }) => {
      await snapshotProject({
        update: options.update ?? false,
        onExit: (code) => process.exit(code),
        onError: (msg) => console.error(msg),
        onSuccess: (msg) => console.log(msg),
      })
    })
}
