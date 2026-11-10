import { type Command, InvalidArgumentError } from "commander"
import kleur from "kleur"

export interface QuoteOptions {
  assembly: boolean
  quantity: number
  json?: boolean
}

const parseQuantity = (value: string) => {
  const quantity = Number(value)
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new InvalidArgumentError("Quantity must be a positive integer.")
  }
  return quantity
}

export const getQuoteCommand = (program: Command) =>
  program.commands.find((command) => command.name() === "quote")!

export const addQuoteOptions = (command: Command) =>
  command
    .argument("[file]", "Path to the source file or circuit JSON to quote")
    .option("--assembly", "Include PCB assembly in the quote", true)
    .option("--no-assembly", "Quote the bare PCB without assembly")
    .option("--quantity <count>", "Number of boards to quote", parseQuantity, 5)
    .option("--json", "Output the quote as JSON")

/**
 * The quote commands are placeholders until the quoting API is available. They
 * parse and validate their flags, then exit non-zero so a script can't mistake
 * a placeholder run for a real quote.
 */
export const reportQuoteNotImplemented = ({
  commandName,
  file,
  options,
}: {
  commandName: string
  file?: string
  options: QuoteOptions
}) => {
  console.error(kleur.yellow(`\`tsci ${commandName}\` is not implemented yet.`))
  console.error(
    kleur.gray(
      `Received: ${JSON.stringify({
        file: file ?? null,
        assembly: options.assembly,
        quantity: options.quantity,
        json: options.json ?? false,
      })}`,
    ),
  )
  process.exitCode = 1
}
