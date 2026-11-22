import type { Command } from "commander"

export const registerInspect = (program: Command) => {
  program
    .command("inspect")
    .description("Inspect design inputs such as footprints")
}
