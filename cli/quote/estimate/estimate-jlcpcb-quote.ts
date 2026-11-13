import fs from "node:fs"
import path from "node:path"
import {
  convertCircuitJsonToJlcpcbQuote,
  formatJlcpcbQuote,
  type JlcpcbQuote,
  parseCircuitJson,
} from "@tscircuit/circuit-json-to-jlcpcb-quote"
import kleur from "kleur"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { isCircuitJsonFile } from "lib/shared/is-circuit-json-file"
import type { QuoteOptions } from "../shared"

/** Messages go to stderr so `--json` keeps stdout parseable. */
const logToStderr = (message: string) => console.error(message)

/**
 * Read a circuit JSON file, or generate circuit JSON from a source file the
 * way other commands do (reusing a current `tsci build`). The quote package
 * has its own circuit-json version, so the elements are checked into its type.
 */
const loadCircuitJson = async (filePath: string) => {
  const circuitJson: unknown = isCircuitJsonFile(filePath)
    ? JSON.parse(await fs.promises.readFile(filePath, "utf-8"))
    : (await getOrGenerateCircuitJson({ filePath })).circuitJson
  return parseCircuitJson(circuitJson)
}

/**
 * Estimate what JLCPCB will charge for a board: fabrication, additional fees
 * the design triggers, Economic or Standard PCBA with parts from jlcsearch,
 * shipping and taxes. The board is converted to the same fabrication files
 * `tsci export -f gerbers` writes and quoted from those.
 *
 * Parts that cannot be priced are left out and listed in the warnings.
 */
export const estimateJlcpcbQuoteForFile = async ({
  file,
  options,
}: {
  file?: string
  options: QuoteOptions
}): Promise<JlcpcbQuote | null> => {
  // Checked before generating circuit JSON or looking up any part.
  if (
    options.assembly &&
    options.assembled !== undefined &&
    options.assembled > options.quantity
  ) {
    throw new Error(
      `Cannot assemble ${options.assembled} boards from ${options.quantity} PCBs; --assembled must not exceed --quantity`,
    )
  }
  const filePath = await getEntrypoint({
    filePath: file,
    onSuccess: (message) => logToStderr(kleur.gray(message)),
    onError: logToStderr,
    onWarning: (message) => logToStderr(kleur.yellow(message)),
  })
  if (!filePath) return null

  const circuitJson = await loadCircuitJson(filePath)
  const showProgress = !options.json && process.stderr.isTTY
  const quote = await convertCircuitJsonToJlcpcbQuote({
    circuitJson,
    quantity: options.quantity,
    assembledQuantity: options.assembly ? options.assembled : undefined,
    assembly: options.assembly ? options.pcba : "none",
    surfaceFinish: options.finish,
    carrier: options.carrier,
    shippingCost: options.shippingCost,
    shippingWeightKg: options.weight,
    unresolvedParts: "exclude",
    onProgress: showProgress
      ? ({ completedLines, totalLines }) =>
          process.stderr.write(
            `\rLooking up parts on jlcsearch: ${completedLines}/${totalLines}${completedLines === totalLines ? "\n" : ""}`,
          )
      : undefined,
  })
  if (options.json) {
    console.log(JSON.stringify(quote, null, 2))
  } else {
    console.log(
      `Quote for ${path.relative(process.cwd(), filePath) || path.basename(filePath)}\n`,
    )
    console.log(formatJlcpcbQuote(quote))
  }
  return quote
}
