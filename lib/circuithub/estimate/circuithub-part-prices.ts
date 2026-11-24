import type { CircuithubEstimatePart } from "./circuithub-estimate-input"

/**
 * Unit prices in USD for parts seen on CircuitHub quotes, at the cut-tape
 * quantities a 5–30 board order buys. They are distributor list prices,
 * checked against the parts totals of real CircuitHub quotes (see
 * tests/fixtures/circuithub-reference-quotes.json); the estimate scales them
 * with CIRCUITHUB_PARTS_PRICE_FACTOR.
 */
export const CIRCUITHUB_REFERENCE_PART_PRICES: Record<string, number> = {
  // Microcontrollers and memory
  "SC0914(13)": 0.9,
  "W25Q16JVUXIQ TR": 0.5,
  W25Q16JVSNIQ: 0.55,
  W25Q128JVSIQ: 1.6,
  // Motor drivers
  DRV8825PWPR: 5.6,
  "TMC2209-LA-T": 3.3,
  "TMC2209-LA": 3.3,
  // USB-PD and power
  "CYPD3177-24LQXQT": 2.6,
  CH224K: 0.6,
  "AP2112K-3.3TRG1": 0.45,
  // Sensing and interface
  INA226AIDGSR: 3.4,
  INA240A1D: 2.9,
  TMP1075DSGT: 0.9,
  TMP102AIDRLR: 1.1,
  TCA9517ADGKR: 1.6,
  SN74LVC1G97DRLR: 0.35,
  // Discretes
  "1N5819HW-7-F": 0.3,
  PMEG6020ELRX: 0.4,
  "BSS84-7-F": 0.2,
  "DMN3404L-7": 0.4,
  DTC114EU3HZGT106: 0.15,
  "SMBJ22CAQ-13-F": 0.45,
  // Passives that cost more than a generic chip part
  "ERJ-8BWFR050V": 0.6,
  "ERJ-8BQFR33V": 0.25,
  "RL1632R-R300-F": 0.45,
  TCJD226M050R0090E: 3,
  BLM18AG601SN1D: 0.1,
  // Electromechanical
  "USB4110-GF-A": 1,
  "S4B-PH-SM4-TB(LF)(SN)": 0.9,
  "BM04B-SRSS-TB(LF)(SN)": 0.55,
  SKRPACE010: 0.5,
  "CMT-8504-100-SMT-TR": 1.4,
  "ABM8-272-T3": 0.75,
  "MF-LSMF200/24X-2": 0.8,
  "1206L110/16WR": 0.3,
  "LTST-C19HE1WT": 0.5,
  "LTST-C190KRKT": 0.3,
}

const largestSide = (part: CircuithubEstimatePart) =>
  Math.max(part.widthMm, part.heightMm)

/** A chip resistor or capacitor's price by size; 0402 and smaller are cheapest. */
const chipSizePrice = (part: CircuithubEstimatePart, prices: number[]) => {
  const size = largestSide(part)
  if (size <= 1.8) return prices[0]!
  if (size <= 2.6) return prices[1]!
  if (size <= 3.4) return prices[2]!
  return prices[3]!
}

/**
 * A part's estimated unit price in USD: its reference price when it has one,
 * otherwise a price by component type, package and pin count.
 */
export const estimateCircuithubPartPrice = (
  part: CircuithubEstimatePart,
): { price: number; source: "reference" | "estimated" } => {
  const reference =
    part.manufacturerPartNumber &&
    CIRCUITHUB_REFERENCE_PART_PRICES[part.manufacturerPartNumber]
  if (reference) return { price: reference, source: "reference" }

  const pins = Math.max(part.padCount, 1)
  const name = `${part.manufacturerPartNumber ?? ""} ${part.ref}`.toUpperCase()
  let price: number
  switch (part.ftype) {
    case "simple_resistor":
      // Current-sense resistors (under 1 Ω) are much dearer than chip resistors.
      price =
        part.value !== undefined && part.value < 1
          ? 0.45
          : chipSizePrice(part, [0.03, 0.03, 0.04, 0.06])
      break
    case "simple_capacitor": {
      const farads = part.value ?? 1e-7
      if (farads > 1.5e-5) price = largestSide(part) > 4 ? 1.5 : 0.4
      else if (farads > 4.7e-6)
        price = chipSizePrice(part, [0.08, 0.1, 0.12, 0.25])
      else if (farads > 1.1e-7)
        price = chipSizePrice(part, [0.04, 0.05, 0.08, 0.15])
      else price = chipSizePrice(part, [0.03, 0.03, 0.05, 0.1])
      break
    }
    case "simple_inductor":
      price = largestSide(part) > 3 ? 0.6 : 0.1
      break
    case "simple_led":
      price = pins >= 4 ? 0.5 : 0.12
      break
    case "simple_diode":
      price = largestSide(part) > 4 ? 0.45 : 0.25
      break
    case "simple_transistor":
    case "simple_mosfet":
      price = 0.2
      break
    case "simple_fuse":
      price = 0.5
      break
    case "simple_crystal":
      price = 0.6
      break
    case "simple_resonator":
      price = 0.4
      break
    case "simple_push_button":
    case "simple_switch":
      price = 0.5
      break
    case "simple_connector":
    case "simple_pin_header":
      price = /USB/.test(name) ? 1 : 0.3 + 0.06 * pins
      break
    default:
      // ICs and anything else: dearer as the pin count grows.
      price = /USB/.test(name) ? 1 : Math.max(0.35, 0.25 + 0.065 * pins)
  }
  return { price, source: "estimated" }
}
