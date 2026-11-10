import type { Command } from "commander"

export const registerQuote = (program: Command) => {
  program
    .command("quote")
    .description("Estimate or create a quote for manufacturing a board")
}
