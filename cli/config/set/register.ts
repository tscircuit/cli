import type { Command } from "commander"
import { type CliConfig, cliConfig } from "lib/cli-config"
import kleur from "kleur"

const availableConfigKeys = [
  "alwaysCloneWithAuthorName",
] satisfies (keyof CliConfig)[]

export const registerConfigSet = (program: Command) => {
  const configCommand = program.commands.find((c) => c.name() === "config")!

  configCommand
    .command("set")
    .description("Set a configuration value")
    .argument(
      "<key>",
      "Configuration key to set (e.g., alwaysCloneWithAuthorName)",
    )
    .argument("<value>", "Value to set (e.g., true or false)")
    .action((key: string, value: string) => {
      if (!availableConfigKeys.includes(key as any)) {
        console.error(kleur.red(`Unknown configuration key: '${key}'`))
        console.log(
          kleur.cyan(`Available keys: ${availableConfigKeys.join(", ")}`),
        )
        process.exit(1)
      }

      if (key === "alwaysCloneWithAuthorName") {
        const booleanValue = value.toLowerCase() === "true"
        cliConfig.set(key, booleanValue)
        console.log(
          kleur.cyan(
            `Set ${kleur.yellow(key)} to ${kleur.yellow(booleanValue.toString())} successfully.`,
          ),
        )
      }
    })
}
