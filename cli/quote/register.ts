import type { Command } from "commander"

export const registerQuote = (program: Command) => {
  program
    .command("quote")
    .description(
      "Estimate (JLCPCB) or get a real quote (CircuitHub) for manufacturing a board",
    )
}
