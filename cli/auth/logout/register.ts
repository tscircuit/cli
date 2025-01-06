import type { Command } from "commander"

export const registerAuthLogout = (program: Command) => {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("logout")
    .description("Logout from registry")
    .action((args) => {
      console.log("logout")
    })
}
