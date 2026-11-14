import type { Command } from "commander"
import { getQuoteCommand } from "../shared"

/**
 * `tsci quote create <manufacturer>` asks a manufacturer for a real quote.
 * Each manufacturer is its own subcommand with its own options (CircuitHub
 * needs a workspace and an export classification, for example); `tsci quote
 * estimate` is the offline JLCPCB estimate.
 */
export const registerQuoteCreate = (program: Command) => {
  getQuoteCommand(program)
    .command("create")
    .description(
      "Get a real quote from a manufacturer (for an offline JLCPCB estimate, use `tsci quote estimate`)",
    )
    .addHelpText(
      "after",
      "\nExample:\n  tsci quote create circuithub board.circuit.tsx --workspace acme --export-classification EAR99",
    )
}
