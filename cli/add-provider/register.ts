import type { Command } from "commander"
import kleur from "kleur"
import { addCircuithubProvider } from "lib/circuithub/add-circuithub-provider"

const PROVIDERS = {
  circuithub: addCircuithubProvider,
} as const

type Provider = keyof typeof PROVIDERS

export const registerAddProvider = (program: Command) => {
  program
    .command("add-provider")
    .description(
      "Connect a manufacturing provider to the CLI by logging in to it (supported: circuithub)",
    )
    .argument("<provider>", "Provider to add: circuithub")
    .action(async (provider: string) => {
      const addProvider = PROVIDERS[provider.toLowerCase() as Provider]
      if (!addProvider) {
        console.error(
          `Unknown provider "${provider}". Supported providers: ${Object.keys(PROVIDERS).join(", ")}.`,
        )
        process.exitCode = 1
        return
      }
      try {
        await addProvider({ log: (message) => console.log(message) })
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
