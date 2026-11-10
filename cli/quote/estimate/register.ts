import type { Command } from "commander"
import {
  type QuoteOptions,
  addQuoteOptions,
  getQuoteCommand,
  reportQuoteNotImplemented,
} from "../shared"

export const registerQuoteEstimate = (program: Command) => {
  addQuoteOptions(
    getQuoteCommand(program)
      .command("estimate")
      .description("Estimate the cost of manufacturing a board"),
  ).action((file: string | undefined, options: QuoteOptions) => {
    reportQuoteNotImplemented({
      commandName: "quote estimate",
      file,
      options,
    })
  })
}
