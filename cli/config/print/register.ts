import type { Command } from "commander"
import { cliConfig } from "lib/cli-config"

export const registerConfigPrint = (program: Command) => {
  program.commands
    .find((c) => c.name() === "config")!
    .command("print")
    .description("Print the current config")
    .action(() => {
      console.log(JSON.stringify(cliConfig.store, null, 2))
    })
}
