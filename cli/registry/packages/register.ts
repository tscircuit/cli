import type { Command } from "commander"

export const registerRegistryPackages = (program: Command) => {
  program.commands
    .find((command) => command.name() === "registry")!
    .command("packages")
    .description("Manage packages in the tscircuit registry")
}
