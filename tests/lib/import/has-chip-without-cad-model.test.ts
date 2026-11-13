import { expect, test } from "bun:test"
import { hasChipWithoutCadModel } from "lib/import/has-chip-without-cad-model"

test("CC2564CRVMR-style imported chip without a model is detected", () => {
  expect(
    hasChipWithoutCadModel(
      `export const CC2564CRVMR = (props) => <chip footprint="qfn76" {...props} />`,
    ),
  ).toBe(true)
})

for (const model of [
  '{{ stepUrl: "./chip.step" }}',
  '{{ objUrl: "https://example.com/chip.obj" }}',
  "{model}",
  '"soic8"',
  "{<extrudedboard />}",
]) {
  test(`keeps explicitly supplied model ${model}`, () => {
    expect(hasChipWithoutCadModel(`<chip cadModel=${model} />`)).toBe(false)
  })
}
for (const model of ["{null}", "{undefined}", "{{}}", '""', '{""}']) {
  test(`detects empty model ${model}`, () => {
    expect(hasChipWithoutCadModel(`<chip cadModel=${model} />`)).toBe(true)
  })
}
test("comments and strings are not models", () => {
  expect(
    hasChipWithoutCadModel(
      `// cadModel={{stepUrl:"x"}}\nconst text = 'cadModel'; const Chip = () => <chip />`,
    ),
  ).toBe(true)
})
test("does not warn about non-chip components or a wrapper", () => {
  expect(hasChipWithoutCadModel(`const Chip = () => <ImportedPart />`)).toBe(
    false,
  )
  expect(
    hasChipWithoutCadModel(`const R = () => <resistor resistance="1k" />`),
  ).toBe(false)
})
test("detects a missing model even when another chip has one", () => {
  expect(
    hasChipWithoutCadModel(
      `<group><chip cadModel="soic8"/><chip></chip></group>`,
    ),
  ).toBe(true)
})

test("does not assume a spread is missing its model", () => {
  expect(
    hasChipWithoutCadModel(
      `const defaults = { cadModel: { stepUrl: "./chip.step" } }; export const C = () => <chip {...defaults} />`,
    ),
  ).toBe(false)
})

test("does not ignore a default model in a component parameter", () => {
  expect(
    hasChipWithoutCadModel(
      `export const C = (props = { cadModel: { stepUrl: "./chip.step" } }) => <chip {...props} />`,
    ),
  ).toBe(false)
})
