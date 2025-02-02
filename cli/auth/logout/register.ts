import type { Command } from "commander"
import { clearSessionToken } from "lib/cli-config"

export const registerAuthLogout = (program: Command) => {
  const logoutAction = () => {
    clearSessionToken()
    console.log("You have been logged out!")
  }

  // Register the auth logout subcommand
  program.commands
    .find((c) => c.name() === "auth")!
    .command("logout")
    .description("Logout from registry")
    .action(logoutAction)

  // Register the top-level logout command as an alias
  program
    .command("logout")
    .description("Logout from tscircuit registry")
    .action(logoutAction)
}
