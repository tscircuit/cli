import type { Command } from "commander"

export const registerReport = (program: Command) => {
  program.command("report").description("Report a tscircuit bug")
}
