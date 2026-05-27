import { expect, test } from "bun:test"
import {
  formatJlcpcbSearchResult,
  getJlcpcbSearchResultIdentifier,
} from "cli/search/format-jlcpcb-search-result"

test("formatJlcpcbSearchResult prefixes JLCPCB identifiers", () => {
  const output = formatJlcpcbSearchResult(
    {
      lcsc: 2040,
      mfr: "RP2040",
      package: "QFN-56",
      description: "RP2040",
      stock: 123456,
      price: 0.75,
    },
    0,
  )

  expect(output).toBe("1. jlcpcb:C2040 - RP2040 (stock: 123,456)")
})

test("getJlcpcbSearchResultIdentifier normalizes existing prefixes", () => {
  expect(getJlcpcbSearchResultIdentifier("2040")).toBe("jlcpcb:C2040")
  expect(getJlcpcbSearchResultIdentifier("C2040")).toBe("jlcpcb:C2040")
  expect(getJlcpcbSearchResultIdentifier("jlcpcb:C2040")).toBe("jlcpcb:C2040")
})

test("formatJlcpcbSearchResult keeps distinct descriptions after the identifier", () => {
  const output = formatJlcpcbSearchResult(
    {
      lcsc: 5555,
      mfr: "SN74LVC1G00",
      package: "SOT-23-5",
      description: "Single 2-input NAND gate",
      stock: 42,
      price: 0.03,
    },
    1,
  )

  expect(output).toBe(
    "2. jlcpcb:C5555 - SN74LVC1G00 - Single 2-input NAND gate (stock: 42)",
  )
})

test("formatJlcpcbSearchResult compares repeated labels case-insensitively", () => {
  const output = formatJlcpcbSearchResult(
    {
      lcsc: "C2040",
      mfr: " RP2040 ",
      description: "rp2040",
      stock: undefined,
    },
    0,
  )

  expect(output).toBe("1. jlcpcb:C2040 - RP2040")
})
