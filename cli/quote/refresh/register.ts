import type { Command } from "commander"
import kleur from "kleur"
import { hasCircuithubSession } from "lib/circuithub/circuithub-provider"
import { refreshCircuithubQuote } from "lib/circuithub/create-circuithub-quote"
import { formatCircuithubQuoteResult } from "lib/circuithub/format-circuithub-quote"
import {
  getQuoteCommand,
  parseCamTimeoutMinutes,
  parseQuoteQuantities,
  reportCircuithubError,
} from "../shared"

interface QuoteRefreshOptions {
  circuithub?: boolean
  quantity?: number[]
  wait?: boolean
  camTimeout: number
  json?: boolean
}

const parseRevisionId = (text: string) => {
  const id = Number(text)
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`"${text}" isn't a CircuitHub revision number.`)
  }
  return id
}

/** Progress goes to stderr so `--json` keeps stdout parseable. */
const logToStderr = (message: string) => console.error(message)

export const registerQuoteRefresh = (program: Command) => {
  getQuoteCommand(program)
    .command("refresh")
    .description(
      "Re-quote a board already uploaded by `tsci quote create`, without uploading it again (e.g. once CircuitHub has measured it)",
    )
    .argument(
      "[revision]",
      "CircuitHub revision to re-quote (default: the last one uploaded)",
    )
    .option("--circuithub", "Re-quote with CircuitHub")
    .option(
      "--quantity <counts>",
      "Boards to quote, or a comma-separated list like 1,5,25 (default: 5)",
      parseQuoteQuantities,
    )
    .option(
      "--wait",
      "Wait for CircuitHub to measure the board before quoting, if it hasn't yet",
    )
    .option(
      "--cam-timeout <minutes>",
      "With --wait, the longest to wait for the measurement",
      parseCamTimeoutMinutes,
      15,
    )
    .option("--json", "Output the result as JSON")
    .action(
      async (revision: string | undefined, options: QuoteRefreshOptions) => {
        if (!options.circuithub) {
          console.error(
            "Choose the manufacturer to re-quote with: --circuithub.",
          )
          process.exitCode = 1
          return
        }
        if (!hasCircuithubSession()) {
          console.error(
            "CircuitHub isn't added yet. Run `tsci auth add-provider circuithub` to sign in, then try again.",
          )
          process.exitCode = 1
          return
        }
        try {
          const result = await refreshCircuithubQuote({
            revisionId:
              revision === undefined ? undefined : parseRevisionId(revision),
            quantities: options.quantity ?? [5],
            wait: options.wait,
            camTimeoutMs: options.camTimeout * 60_000,
            log: (message) => logToStderr(kleur.gray(message)),
          })
          console.log(
            options.json
              ? JSON.stringify(result, null, 2)
              : formatCircuithubQuoteResult(result),
          )
        } catch (error) {
          reportCircuithubError(error)
        }
      },
    )
}
