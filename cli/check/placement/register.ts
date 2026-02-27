import type { Command } from "commander"

export const registerCheckPlacement = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("placement")
    .description("Partially build and validate the placement")
    .argument("[refdeses]", "Optional refdeses to scope the check")
    .action(() => {
      throw new Error("Not implemented")
    })
}
