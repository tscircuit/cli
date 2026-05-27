import { expect, test } from "bun:test"
import { formatJlcpcbImportChoiceTitle } from "cli/import/format-jlcpcb-import-choice-title"

test("formatJlcpcbImportChoiceTitle prefixes JLCPCB identifiers", () => {
  expect(
    formatJlcpcbImportChoiceTitle({
      lcsc: 2040,
      mfr: "RP2040",
      description: "RP2040",
    }),
  ).toBe("jlcpcb:C2040 - RP2040")
})

test("formatJlcpcbImportChoiceTitle keeps distinct descriptions", () => {
  expect(
    formatJlcpcbImportChoiceTitle({
      lcsc: "C5555",
      mfr: "SN74LVC1G00",
      description: "Single 2-input NAND gate",
    }),
  ).toBe("jlcpcb:C5555 - SN74LVC1G00 - Single 2-input NAND gate")
})
