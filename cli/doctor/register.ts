import type { Command } from "commander"
import { runDoctor } from "./run-doctor"

export const registerDoctor = (program: Command) => {
  program
    .command("doctor")
    .description("Run diagnostic checks for your tscircuit setup")
    .action(async () => {
      await runDoctor()
    })
}
