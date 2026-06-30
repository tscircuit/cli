import type { Command } from "commander"
import { ensureLatestTsciAgent } from "./ensure-latest-tsci-agent"
import { runTsciAgent } from "./run-tsci-agent"

export function registerAgent(program: Command) {
  program
    .command("agent [args...]")
    .description("Install/update and run tsci-agent")
    .allowUnknownOption(true)
    .helpOption(false)
    .action(async (args: string[]) => {
      const canRunAgent = await ensureLatestTsciAgent()
      if (!canRunAgent) {
        process.exitCode = 1
        return
      }

      process.exitCode = await runTsciAgent(args)
    })
}
