import type { Command } from "commander"
import kleur from "kleur"
import { getProvider, unknownProviderMessage } from "lib/providers/providers"

export const registerAuthAddProvider = (program: Command) => {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("add-provider")
    .description(
      "Connect a manufacturing provider to the CLI by logging in to it (supported: circuithub)",
    )
    .argument("<provider>", "Provider to add: circuithub")
    .action(async (name: string) => {
      const provider = getProvider(name)
      if (!provider) {
        console.error(unknownProviderMessage(name))
        process.exitCode = 1
        return
      }
      try {
        await provider.add({ log: (message) => console.log(message) })
        // Make sure nothing (like a readline on stdin) keeps the process alive.
        process.exit(0)
      } catch (error) {
        console.error(
          kleur.red(error instanceof Error ? error.message : String(error)),
        )
        process.exitCode = 1
      }
    })
}
