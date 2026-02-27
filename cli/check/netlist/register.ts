import type { Command } from "commander"

export const registerCheckNetlist = (program: Command) => {
  program.commands
    .find((c) => c.name() === "check")!
    .command("netlist")
    .description("Partially build and validate the netlist")
    .argument("[refdeses]", "Optional refdeses to scope the check")
    .action(() => {
      throw new Error("Not implemented")
    })
}
