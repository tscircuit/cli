import type { Command } from "commander"
import kleur from "kleur"
import { type QuoteOptions, addQuoteOptions, getQuoteCommand } from "../shared"
import { estimateCircuithubQuoteForFile } from "./estimate-circuithub-quote"
import { estimateJlcpcbQuoteForFile } from "./estimate-jlcpcb-quote"

export const registerQuoteEstimate = (program: Command) => {
  addQuoteOptions(
    getQuoteCommand(program)
      .command("estimate")
      .description(
        "Estimate the JLCPCB cost of manufacturing a board: fabrication, assembly, parts, shipping and taxes",
      ),
  )
    .option(
      "--circuithub",
      "Estimate CircuitHub's assembled-board prices instead, offline (no account or network needed)",
    )
    .action(
      async (
        file: string | undefined,
        options: QuoteOptions & { circuithub?: boolean },
      ) => {
        try {
          const quote = options.circuithub
            ? await estimateCircuithubQuoteForFile({ file, options })
            : await estimateJlcpcbQuoteForFile({ file, options })
          if (!quote) process.exitCode = 1
        } catch (error) {
          console.error(
            kleur.red(error instanceof Error ? error.message : String(error)),
          )
          process.exitCode = 1
        }
      },
    )
}
