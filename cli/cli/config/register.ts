import type { Command } from "commander"

export const registerConfig = (program: Command) => {
  program.command("config").description("Manage tscircuit CLI configuration")
}
