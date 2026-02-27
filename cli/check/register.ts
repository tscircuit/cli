import type { Command } from "commander"

export const registerCheck = (program: Command) => {
  program
    .command("check")
    .description("Partially build and validate circuit artifacts")
}
