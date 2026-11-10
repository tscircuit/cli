import type { Command } from "commander"
import {
  type QuoteOptions,
  addQuoteOptions,
  getQuoteCommand,
  reportQuoteNotImplemented,
} from "../shared"

export const registerQuoteCreate = (program: Command) => {
  addQuoteOptions(
    getQuoteCommand(program)
      .command("create")
      .description("Create a quote for manufacturing a board"),
  ).action((file: string | undefined, options: QuoteOptions) => {
    reportQuoteNotImplemented({
      commandName: "quote create",
      file,
      options,
    })
  })
}
