import type { Command } from "commander"
import { clearSession, getSessionToken } from "lib/cli-config"

export const registerAuthLogout = (program: Command) => {
  const logoutAction = () => {
    const session = getSessionToken()
    if (!session) {
      console.log("You are not logged in!")
      return
    }
    clearSession()
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
