import { type Command, InvalidArgumentError } from "commander"
import kleur from "kleur"
import { CircuithubApiError } from "lib/circuithub/circuithub-api"
import {
  clearCircuithubToken,
  getCircuithubToken,
} from "lib/circuithub/circuithub-config"

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

/** `--quantity 5` or `--quantity 1,5,25`. */
export const parseQuoteQuantities = (text: string) => {
  const quantities = text.split(",").map((part) => Number(part.trim()))
  if (
    quantities.length === 0 ||
    quantities.some((count) => !Number.isInteger(count) || count < 1)
  ) {
    throw new InvalidArgumentError(
      "Quantity must be a positive integer or a comma-separated list of them.",
    )
  }
  return quantities
}

export const parseCamTimeoutMinutes = (text: string) => {
  const minutes = Number(text)
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new InvalidArgumentError("CAM timeout must be a number of minutes.")
  }
  return minutes
}

/** Print a CircuitHub command's error and set a failing exit code. */
export const reportCircuithubError = (error: unknown) => {
  // A saved session CircuitHub rejects is useless; forget it so
  // `tsci auth add-provider circuithub` logs in again.
  if (
    error instanceof CircuithubApiError &&
    error.status === 401 &&
    getCircuithubToken()?.source === "login"
  ) {
    clearCircuithubToken()
  }
  console.error(
    kleur.red(error instanceof Error ? error.message : String(error)),
  )
  process.exitCode = 1
}
