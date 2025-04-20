import type { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import { checkForTsciUpdates } from "lib/shared/check-for-cli-update"

export function registerUpgradeCommand(program: Command) {
  program
    .command("upgrade")
    .description("Upgrade CLI to the latest version")
    .action(async () => {
      const isUpdated = await checkForTsciUpdates()
      if (!isUpdated) {
        console.log(
          chalk.green("You are already using the latest version of tsci."),
        )
        return
      }
    })
}
