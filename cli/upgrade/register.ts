import type { Command } from "commander"
import kleur from "kleur"
import {
  currentCliVersion,
  updateTsciIfNewVersionIsAvailable,
} from "lib/shared/check-for-cli-update"

export function registerUpgradeCommand(program: Command) {
  program
    .command("upgrade")
    .description("Upgrade CLI to the latest version")
    .action(async () => {
      const isUpdated = await updateTsciIfNewVersionIsAvailable()
      if (!isUpdated) {
        console.log(
          kleur.green(
            `You are already using the latest version of tsci (v${currentCliVersion()})`,
          ),
        )
      }
    })
}
