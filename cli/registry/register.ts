import type { Command } from "commander"

export const registerRegistry = (program: Command) => {
  program.command("registry").description("Manage tscircuit registry resources")
}
