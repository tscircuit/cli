import { type Command, InvalidArgumentError } from "commander"
import kleur from "kleur"

export type PcbaType = "auto" | "economic" | "standard"
export type SurfaceFinish = "hasl_lead_free" | "hasl_leaded" | "enig"
export type ShippingCarrier = "dhl" | "ups"

export interface QuoteOptions {
  assembly: boolean
  quantity: number
  assembled?: number
  pcba: PcbaType
  finish: SurfaceFinish
  carrier: ShippingCarrier
  shippingCost?: number
  weight?: number
  json?: boolean
}

const parsePositiveInteger = (label: string) => (text: string) => {
  const count = Number(text)
  if (!Number.isInteger(count) || count < 1) {
    throw new InvalidArgumentError(`${label} must be a positive integer.`)
  }
  return count
}

const parseNonNegativeNumber = (label: string) => (text: string) => {
  const amount = Number(text)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new InvalidArgumentError(`${label} must be a number of at least 0.`)
  }
  return amount
}

const parseChoice =
  <Choice extends string>(label: string, choices: Choice[]) =>
  (text: string): Choice => {
    const choice = choices.find((candidate) => candidate === text)
    if (!choice) {
      throw new InvalidArgumentError(
        `${label} must be one of: ${choices.join(", ")}.`,
      )
    }
    return choice
  }

export const getQuoteCommand = (program: Command) =>
  program.commands.find((command) => command.name() === "quote")!

export const addQuoteOptions = (command: Command) =>
  command
    .argument("[file]", "Path to the source file or circuit JSON to quote")
    .option("--assembly", "Include PCB assembly in the quote", true)
    .option("--no-assembly", "Quote the bare PCB without assembly")
    .option(
      "--quantity <count>",
      "Number of PCBs to quote",
      parsePositiveInteger("Quantity"),
      5,
    )
    .option(
      "--assembled <count>",
      "Number of PCBs to assemble, at most --quantity (default: 2, or --quantity if lower)",
      parsePositiveInteger("Assembled boards"),
    )
    .option(
      "--pcba <type>",
      "PCB assembly service: auto (Economic when the board allows it), economic or standard",
      parseChoice<PcbaType>("PCBA type", ["auto", "economic", "standard"]),
      "auto",
    )
    .option(
      "--finish <finish>",
      "Surface finish: hasl_lead_free, hasl_leaded or enig",
      parseChoice<SurfaceFinish>("Surface finish", [
        "hasl_lead_free",
        "hasl_leaded",
        "enig",
      ]),
      "hasl_lead_free",
    )
    .option(
      "--carrier <carrier>",
      "Shipping carrier for the grand total: dhl or ups",
      parseChoice<ShippingCarrier>("Carrier", ["dhl", "ups"]),
      "dhl",
    )
    .option(
      "--shipping-cost <usd>",
      "Exact shipping cost from JLCPCB's checkout (estimated if omitted)",
      parseNonNegativeNumber("Shipping cost"),
    )
    .option(
      "--weight <kg>",
      "Order weight from JLCPCB's quote page (estimated if omitted)",
      parseNonNegativeNumber("Weight"),
    )
    .option("--json", "Output the quote as JSON")

/**
 * `tsci quote create` is a placeholder until ordering is available. It parses
 * and validates its flags, then exits non-zero so a script can't mistake a
 * placeholder run for a real quote.
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
