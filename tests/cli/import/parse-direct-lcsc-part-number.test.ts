import { expect, test } from "bun:test"
import { parseDirectLcscPartNumber } from "cli/import/parse-direct-lcsc-part-number"

test("parseDirectLcscPartNumber returns C-prefixed part for raw part number", () => {
  expect(parseDirectLcscPartNumber("14877")).toBe("C14877")
})

test("parseDirectLcscPartNumber returns normalized C-prefixed part for prefixed query", () => {
  expect(parseDirectLcscPartNumber("c14877")).toBe("C14877")
})

test("parseDirectLcscPartNumber returns null for non-part queries", () => {
  expect(parseDirectLcscPartNumber("RP2040")).toBe(null)
})
