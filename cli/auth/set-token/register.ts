import type { Command } from "commander"
import { cliConfig } from "lib/cli-config"

function validateJWTLength(token: string) {
  const parts = token.split(".")

  if (parts.length === 3 && parts.every((part) => part.length > 0)) {
    return true
  } else {
    return false
  }
}
export const registerAuthSetToken = (program: Command) => {
  program.commands
    .find((c) => c.name() === "auth")!
    .command("set-token")
    .description("Explicitly set your auth token")
    .argument("<token>", "New token to manually configure")
    .action((token) => {
      if (!validateJWTLength(token))
        return console.log("Invalid token provided")
      cliConfig.set("sessionToken", token)
      console.log("Token manually updated.")
    })
}
