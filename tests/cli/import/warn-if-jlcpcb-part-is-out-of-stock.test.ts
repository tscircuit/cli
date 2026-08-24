import { expect, spyOn, test } from "bun:test"
import { warnIfJlcpcbPartIsOutOfStock } from "cli/import/warn-if-jlcpcb-part-is-out-of-stock"

test("warns without blocking when a JLCPCB part is out of stock", () => {
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {})

  try {
    warnIfJlcpcbPartIsOutOfStock({
      partNumber: "C1526234",
      stock: 0,
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(Bun.stripANSI(String(warnSpy.mock.calls[0]?.[0]))).toBe(
      "Warning: C1526234 is currently out of stock at JLCPCB. The component will still be imported.",
    )
  } finally {
    warnSpy.mockRestore()
  }
})
