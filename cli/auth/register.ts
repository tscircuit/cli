import type { Command } from "commander"

export const registerAuth = (program: Command) => {
  program.command("auth").description("Login/logout")
}
