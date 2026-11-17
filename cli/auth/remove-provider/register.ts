import type { Command } from "commander"
import kleur from "kleur"
import { getProvider, unknownProviderMessage } from "lib/providers/providers"

export const registerAuthRemoveProvider = (program: Command) => {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("remove-provider")
    .description(
      "Disconnect a manufacturing provider: forget its saved login (supported: circuithub)",
    )
    .argument("<provider>", "Provider to remove: circuithub")
    .action(async (name: string) => {
      const provider = getProvider(name)
      if (!provider) {
        console.error(unknownProviderMessage(name))
        process.exitCode = 1
        return
      }
      try {
        await provider.remove({ log: (message) => console.log(message) })
      } catch (error) {
        console.error(
          kleur.red(error instanceof Error ? error.message : String(error)),
        )
        process.exitCode = 1
      }
    })
}
