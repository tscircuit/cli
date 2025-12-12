import type { Command } from "commander"
import kleur from "kleur"
import { getSessionToken } from "lib/cli-config"
import { setupNpmrc } from "./setup-npmrc"

export function registerAuthSetupNpmrc(program: Command) {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("setup-npmrc")
    .description(
      "Configure your global .npmrc file with authentication for tscircuit private packages",
    )
    .action(async () => {
      const sessionToken = getSessionToken()

      if (!sessionToken) {
        console.log(
          kleur.red("Error: Not logged in. Please run 'tsci login' first."),
        )
        process.exit(1)
      }

      setupNpmrc(sessionToken)
    })
}
