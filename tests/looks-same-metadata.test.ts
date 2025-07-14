import { test, expect } from "bun:test"
import looksSame from "looks-same"

const svgBase = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>`
const svgChanged = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" data-software-used-string="@tscircuit/core@0.0.562"><rect width="10" height="10"/></svg>`

test("looksSame ignores metadata differences", async () => {
  const { equal } = await looksSame(Buffer.from(svgBase), Buffer.from(svgChanged), {
    strict: false,
    tolerance: 2,
  })
  expect(equal).toBe(true)
})

function normalizeSvg(s: string) {
  return s.replace(/\s*data-software-used-string="[^"]*"/g, "")
}

test("snapshot fallback ignores software version", () => {
  expect(normalizeSvg(svgBase)).toBe(normalizeSvg(svgChanged))
})
