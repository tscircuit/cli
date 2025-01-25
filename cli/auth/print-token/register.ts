import type { Command } from "commander"
import { cliConfig } from "lib/cli-config"

export const registerAuthPrintToken = (program: Command) => {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("print-token")
    .description("Prints your auth token")
    .action(() => {
      const token = cliConfig.get("sessionToken")
      if (!token) return console.log("You need to log in to access this.")
      console.log("Your Token:\n", token)
    })
}
