import { describe, expect, test } from "bun:test"
import { getQueryFromParts } from "./get-query-from-parts"

describe("getQueryFromParts", () => {
  test("joins multi-word query parts", () => {
    expect(getQueryFromParts(["USB", "Type", "C", "receptacle", "16P"])).toBe(
      "USB Type C receptacle 16P",
    )
  })

  test("trims surrounding whitespace", () => {
    expect(getQueryFromParts([" LED", "0603", "green "])).toBe("LED 0603 green")
  })
})
