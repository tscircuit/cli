import fs from "node:fs"
import type { AnyCircuitElement } from "circuit-json"
import kleur from "kleur"
import { getCircuithubEstimateInput } from "lib/circuithub/estimate/circuithub-estimate-input"
import {
  type CircuithubEstimate,
  estimateCircuithubQuote,
} from "lib/circuithub/estimate/estimate-circuithub-quote"
import { formatCircuithubEstimate } from "lib/circuithub/estimate/format-circuithub-estimate"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { isCircuitJsonFile } from "lib/shared/is-circuit-json-file"
import type { QuoteOptions } from "../shared"

const logToStderr = (message: string) => console.error(message)

/**
 * Estimate CircuitHub's prices for a board offline: no CircuitHub account,
 * API call or part lookup. Uses a calibration fitted to real CircuitHub quotes.
 */
export const estimateCircuithubQuoteForFile = async ({
  file,
  options,
}: {
  file?: string
  options: QuoteOptions
}): Promise<CircuithubEstimate | null> => {
  if (!options.assembly) {
    throw new Error(
      "CircuitHub builds assembled boards; drop --no-assembly to estimate them.",
    )
  }
  const filePath = await getEntrypoint({
    filePath: file,
    onSuccess: (message) => logToStderr(kleur.gray(message)),
    onError: logToStderr,
    onWarning: (message) => logToStderr(kleur.yellow(message)),
  })
  if (!filePath) return null

  const circuitJson = (
    isCircuitJsonFile(filePath)
      ? JSON.parse(await fs.promises.readFile(filePath, "utf-8"))
      : (await getOrGenerateCircuitJson({ filePath })).circuitJson
  ) as AnyCircuitElement[]
  const estimate = estimateCircuithubQuote(
    getCircuithubEstimateInput(circuitJson),
    { quantity: options.quantity },
  )
  console.log(
    options.json
      ? JSON.stringify(estimate, null, 2)
      : formatCircuithubEstimate(estimate),
  )
  return estimate
}
