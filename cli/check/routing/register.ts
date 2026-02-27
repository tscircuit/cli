import type { Command } from "commander"

export const registerCheckRouting = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("routing")
    .description("Partially build and validate the routing")
    .action(() => {
      throw new Error("Not implemented")
    })
}
